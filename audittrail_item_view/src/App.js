import React from "react";
import "./App.css";
import mondaySdk from "monday-sdk-js";
import "monday-ui-react-core/dist/main.css";
import {
  AttentionBox,
  Flex,
  Button,
  Tooltip,
  Table,
  TableHeader,
  TableHeaderCell,
  TableRow,
  TableCell,
  TableBody,
  Text,
} from "monday-ui-react-core";
import { Completed } from "monday-ui-react-core/icons";

import { getAuditTrailIndex, getAuditTrailItem } from "./data";
import { debounce } from "lodash";

const monday = mondaySdk();
monday.setApiVersion("2023-10");

const CenterContent = ({ children }) => (
  <Flex
    align="Center"
    justify="Center"
    style={{ height: "100vh", width: "100vw" }}
  >
    {children}
  </Flex>
);

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      settings: {},
      context: {},
      auditIndex: null,
      sessionToken: null,
    };
  }

  componentDidMount() {
    monday.listen("settings", this.getSettings);
    monday.listen("context", this.getContext);
    monday.listen("sessionToken", this.setSessionToken);
    // App is rendering - value has been created
    monday.execute("valueCreatedForUser");
  }

  setSessionToken = (res) => {
    // console.log("sessionToken!", res.data);
    this.setState({ sessionToken: res.data }, () =>
      this.debouncedGetAuditIndex()
    );
  };

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
    this.setState({ context });
    // this.getAuditIndex(context.itemId);
  };

  getAuditIndex = async (itemId) => {
    const sessionToken = this.state.sessionToken;
    if (!sessionToken || !itemId) {
      // console.log("No session token or itemId found");
      return;
    }
    const data = await getAuditTrailIndex(itemId, sessionToken);
    // console.log("getAuditIndex", data);
    this.setState({ auditIndex: data.value || { index: [] } });
  };

  debouncedGetAuditIndex = debounce(() => {
    this.getAuditIndex(this.state.context.itemId);
  }, 1000);

  downloadItem = async (key) => {
    const sessionToken = this.state.sessionToken;

    if (!sessionToken) {
      console.log("No session token found");
      return;
    }

    const data = await getAuditTrailItem(key, sessionToken);
    // console.log("downloadItem", data);
    const { value } = data;
    // const doc = value.htmlDocument;
    const link = document.createElement("a");
    link.href = `data:text/html;charset=utf-8,${encodeURIComponent(value)}`;
    link.download = "audit_trail_item.html";
    link.click();
  };

  renderAuditIndex = () => {
    const { auditIndex } = this.state;

    return (
      <Table
        columns={[
          { id: "createdAt", title: "Created At", width: 200 },
          { id: "createdBy", title: "Created By", width: 150 },
          { id: "action", title: "Action", width: 200 },
          { id: "esig", title: "E-Sig", width: 70 },
          { id: "view", title: "View", width: 100 },
        ]}
        style={{
          width: "auto",
        }}
        emptyState={
          <TableCell>
            <Text style={{ width: "100%" }} align={Text.align.CENTER}>
              The audit trail for this item is currently empty
            </Text>
          </TableCell>
        }
      >
        <TableHeader>
          <TableHeaderCell title="Created At" />
          <TableHeaderCell title="Created By" />
          <TableHeaderCell title="Action" />
          <TableHeaderCell title="E-Sig" />
          <TableHeaderCell title="View" />
        </TableHeader>
        <TableBody>
          {auditIndex.index.map((auditTrailItem) => {
            const { createdBy, createdAt, action, key } = auditTrailItem;
            const formattedDate =
              (createdAt && new Date(createdAt).toLocaleString()) || "-";
            return (
              <TableRow key={key}>
                <TableCell>{formattedDate}</TableCell>
                <TableCell>{createdBy || "-"}</TableCell>
                <TableCell>{action || "-"}</TableCell>
                <TableCell>
                  <Tooltip
                    content={
                      auditTrailItem.hasESignature ? "has E-Signature" : ""
                    }
                    paddingSize="NONE"
                  >
                    {auditTrailItem.hasESignature ? (
                      <Text>
                        <Completed style={{ marginTop: "5px" }} />
                      </Text>
                    ) : (
                      ""
                    )}
                  </Tooltip>
                </TableCell>
                <TableCell>
                  <Button
                    size="small"
                    kind="primary"
                    onClick={() => this.downloadItem(key)}
                  >
                    View
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    );
  };

  render() {
    const { auditIndex, errorMessage } = this.state;

    if (!auditIndex) {
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

    return <div className="App">{this.renderAuditIndex()}</div>;
  }
}

export default App;
