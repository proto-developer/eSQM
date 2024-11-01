import React from "react";
import "monday-ui-react-core/dist/main.css";
import { ESignModal } from "./components/eSignModal/ESignModal";
import { AttentionBox, Flex } from "monday-ui-react-core";
import { ProgressIndicator } from "./components/progressIndicator/ProgressIndicator";
import { getItemWorkflowState, performAction } from "./apis/mondayAPIs";
import debounce from "lodash/debounce";
import mondaySdk from "monday-sdk-js";
import { CenterContent } from "./components/centerContent/CenterContent";
import { ActionButton } from "./components/actionButton/ActionButton";
import { ActionMessage } from "./components/actionMessage/ActionMessage";
import { Heading } from "monday-ui-react-core/next";
import { getItemState } from "./apis/data";
import { Workflow } from "monday-ui-react-core/icons";

const monday = mondaySdk();
monday.setApiVersion("2023-10");

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      settings: {},
      context: {},
      items: null,
      itemState: null,
      sessionToken: null,
      workflowState: null,
      loadingAction: false,
      errorMessage: null,
      actionMessages: null,
      workflowRejectionReason: null,
      showModal: false,
      currentAction: null,
    };
  }

  componentDidMount() {
    monday.listen("settings", this.getSettings);
    monday.listen("context", this.getContext);
    monday.listen("sessionToken", this.setSessionToken);
    // App is rendering - value has been created
    monday.execute("valueCreatedForUser");
  }

  getSettings = (res) => {
    this.setState({ settings: res.data });
    // console.log("settings!", res.data);
  };

  setBodyTheme = (theme) => {
    // Monday passes the theme in the context, but we need to set it on the body
    // so that the monday-ui-react-core components pick it up
    document.body.className = `${theme}-app-theme`;
  };

  getContext = (res) => {
    const context = res.data;
    // console.log("context!", context);
    this.setBodyTheme(context.theme);
    this.setState({ context }, () => this.debouncedGetItemState());
  };

  setSessionToken = (res) => {
    // console.log("sessionToken!", res.data);
    this.setState({ sessionToken: res.data }, () =>
      this.debouncedGetItemState()
    );
  };

  debouncedGetItemState = debounce(() => {
    getItemState(this.state.context.itemId, this.state.context.boardId).then(
      (resp) => {
        // console.log("itemState!", resp);
        this.setState({ itemState: resp, loading: false }, () =>
          this.getWorkflowState()
        );
      }
    );
  }, 1000);

  getWorkflowState = async () => {
    const itemState = this.state.itemState;
    const sessionToken = this.state.sessionToken;

    if (!itemState || !sessionToken) {
      return;
    }
    const workflowState = await getItemWorkflowState(itemState, sessionToken);
    this.setState({ workflowState });
  };

  doWorkflowAction = async (action, pin = null) => {
    const { itemState, sessionToken } = this.state;
    this.setState({
      loadingAction: action.title,
      workflowRejectionReason: null,
      actionMessages: null,
      showModal: false,
      currentAction: null,
    });
    const result = await performAction(
      itemState,
      { actionName: action.title, pin },
      sessionToken
    );
    if (result.success) {
      this.setState(
        {
          itemState: {
            board: itemState.board,
            item: {
              ...itemState.item,
              state: result.nextState,
            },
          },
          actionMessages: result.messages,
        },
        () => this.getWorkflowState()
      );
    } else {
      if (result?.error) {
        this.setState({ errorMessage: result.error });
      }
      if (result?.reasons) {
        this.setState({
          workflowRejectionReason: result.reasons,
          actionMessages: result.messages,
        });
      }
    }
    this.setState({ loadingAction: false });
  };

  showESignatureModal = async (action) => {
    this.setState({ showModal: true, currentAction: action });
  };

  hideESignatureModal = () => {
    this.setState({ showModal: false, currentAction: null });
  };

  startWorkflowAction = async (action) => {
    if (action.requiresESignature) {
      this.showESignatureModal(action);
    } else {
      await this.doWorkflowAction(action);
    }
  };

  clearWorkflowError = () => {
    this.setState({ workflowRejectionReason: null });
  };

  renderWorkflowActions = () => {
    const {
      workflowState,
      itemState,
      workflowRejectionReason,
      actionMessages,
      loadingAction,
    } = this.state;

    if (!workflowState || !itemState) {
      return null;
    }

    return (
      <Flex
        direction={Flex.directions.COLUMN}
        gap={Flex.gaps.MEDIUM}
        align={Flex.align.START}
        style={{ maxWidth: "100%", padding: "20px" }}
      >
        <Flex
          direction={Flex.directions.COLUMN}
          gap={Flex.gaps.SMALL}
          align={Flex.align.START}
        >
          <Heading type="h3">{itemState.item.name} Progress:</Heading>
          <ProgressIndicator {...workflowState} />
        </Flex>

        <Flex
          direction={Flex.directions.COLUMN}
          gap={Flex.gaps.SMALL}
          align={Flex.align.START}
        >
          <Heading type="h3">{itemState.board.name} Workflow Actions:</Heading>
          <Flex gap={Flex.gaps.SMALL} wrap style={{ maxWidth: "100%" }}>
            {workflowState.permissableActions
              .filter(
                (action) =>
                  action.canPerformAction || !(action.hideIfNotAllowed || false)
              )
              .map((action) => (
                <ActionButton
                  key={action.key}
                  action={action}
                  loadingAction={loadingAction}
                  onClick={this.startWorkflowAction}
                />
              ))}
            {!Object.keys(workflowState.permissableActions).length && (
              <AttentionBox
                title="Workflow Complete"
                icon={Workflow}
                type={AttentionBox.types.SUCCESS}
                className="alerts"
              >
                No actions available!
              </AttentionBox>
            )}
          </Flex>
        </Flex>

        {!!actionMessages &&
          actionMessages.map((message, i) => (
            <ActionMessage key={i} message={message} />
          ))}

        {workflowRejectionReason && (
          <AttentionBox
            title="Workflow action rejected"
            type={AttentionBox.types.WARNING}
            className="alerts"
            onClose={this.clearWorkflowError}
          >
            Please correct the issues shown and try again
          </AttentionBox>
        )}
      </Flex>
    );
  };

  render() {
    const { workflowState, errorMessage } = this.state;

    if (!workflowState) {
      return <CenterContent>Loading...</CenterContent>;
    }
    if (errorMessage) {
      return (
        <CenterContent>
          <AttentionBox title="Error" type="error">
            Failed due to: {errorMessage}
          </AttentionBox>
        </CenterContent>
      );
    }

    return (
      <div className="App">
        {this.renderWorkflowActions()}
        <ESignModal
          show={this.state.showModal}
          setClosed={this.hideESignatureModal}
          action={this.state.currentAction}
          onSubmit={this.doWorkflowAction}
          sessionToken={this.state.sessionToken}
        />
      </div>
    );
  }
}

export default App;
