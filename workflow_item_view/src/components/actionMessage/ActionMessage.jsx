import { AttentionBox, AttentionBoxLink } from "monday-ui-react-core";
import mondaySdk from "monday-sdk-js";
import { TextBR } from "../textBR/TextBR";

const monday = mondaySdk();
monday.setApiVersion("2023-10");

export const ActionMessage = ({ message }) => {
  if (typeof message === "string") {
    return (
      <AttentionBox>
        <TextBR content={message} />
      </AttentionBox>
    );
  }
  const types = {
    success: AttentionBox.types.SUCCESS,
    error: AttentionBox.types.DANGER,
    info: AttentionBox.types.PRIMARY,
  };
  const type =
    message.type in types ? types[message.type] : AttentionBox.types.PRIMARY;
  return (
    <AttentionBox className="alerts" type={type}>
      <TextBR content={message.message} />
      {!!message.item_url && (
        <p>
          <AttentionBoxLink
            inlineText
            textClassName="alerts-link"
            onClick={() =>
              monday.execute("openLinkInTab", { url: message.item_url })
            }
            text="View item"
          />
        </p>
      )}
    </AttentionBox>
  );
};
