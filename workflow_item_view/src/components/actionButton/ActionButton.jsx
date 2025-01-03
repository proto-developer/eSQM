import { Button, Tooltip } from "monday-ui-react-core";
import { AddSmall, Form } from "monday-ui-react-core/icons";

const guessButtonType = (title, canPerformAction) => {
  const fowardWords = ["submit", "complete", "close", "capa approved"];
  const backWords = ["return", "re-assessment"];
  const cancelWords = ["reject", "deny", "cancel"];
  const createWords = ["create", "add"];
  const eSignActions = [
    "disqualified supplier",
    "in-activated supplier",
    "restricted supplier",
    "capa completed",
    "ec completed",
    "cancel ec",
    "ec approved",
  ];

  const titleLower = title.toLowerCase();

  if (
    cancelWords.some((word) => titleLower.includes(word)) &&
    eSignActions.some((word) => titleLower === word)
  ) {
    return {
      kind: Button.kinds.PRIMARY,
      leftIcon: Form,
      color: Button.colors.NEGATIVE,
    };
  }

  if (backWords.some((word) => titleLower.includes(word)) && canPerformAction) {
    return {
      style: { backgroundColor: "#ffd700" },
    };
  }

  if (eSignActions.some((word) => titleLower === word)) {
    return {
      kind: Button.kinds.PRIMARY,
      leftIcon: Form,
      color: Button.colors.POSITIVE,
    };
  }

  if (fowardWords.some((word) => titleLower.includes(word))) {
    return { color: Button.colors.POSITIVE };
  }
  if (cancelWords.some((word) => titleLower.includes(word))) {
    return { color: Button.colors.NEGATIVE };
  }

  if (createWords.some((word) => titleLower.includes(word))) {
    return {
      kind: Button.kinds.PRIMARY,
      leftIcon: AddSmall,
    };
  }

  return { color: Button.colors.PRIMARY };
};

export const ActionButton = ({ action, loadingAction, onClick }) => {
  let message = " "; // Empty string to avoid tooltip not showing
  let title = "";
  const isCreateChildBtn = action?.title?.toLowerCase().includes("create");
  const childName = action?.title?.split(" ").slice(1).join(" ");

  if (isCreateChildBtn && action.canPerformAction) {
    title = `Creates a new "${childName}" item`;
  } else if (isCreateChildBtn && !action.canPerformAction) {
    title = `Cannot create new "${childName}" item. Issues:`;
    message = (
      <ul>
        {action.unavailableReasons.map((reason, i) => (
          <li key={i}>{reason}</li>
        ))}
      </ul>
    );
  } else if (!action.canPerformAction) {
    title = `Cannot move item to "${action.newState}". Issues:`;
    message = (
      <ul>
        {action.unavailableReasons.map((reason, i) => (
          <li key={i}>{reason}</li>
        ))}
      </ul>
    );
  } else {
    title = `Moves item to "${action.newState}"`;
  }

  return (
    <Tooltip key={action.key} title={title} content={message} withMaxWidth>
      <Button
        loading={loadingAction === action.title}
        disabled={!action.canPerformAction || !!loadingAction}
        onClick={() => onClick(action)}
        {...guessButtonType(action.title, action.canPerformAction)}
      >
        {action.title}
      </Button>
    </Tooltip>
  );
};
