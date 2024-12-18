import { useState } from "react";
import HelpModal from "../helpModal/HelpModal";
import { Button } from "monday-ui-react-core";

const FeedbackButton = ({ setOpen }) => {
  return (
    <Button
      onClick={setOpen}
      kind={Button.kinds.PRIMARY}
      size={Button.sizes.MEDIUM}
    >
      Help
    </Button>
  );
};

export const FeedbackWidget = ({ documentationLink, supportEmail }) => {
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  return (
    <div style={{ position: "fixed", bottom: 25, right: 25 }}>
      <HelpModal
        show={feedbackOpen}
        setClosed={() => setFeedbackOpen(false)}
        documentationLink={documentationLink}
        supportEmail={supportEmail}
      />
      <FeedbackButton setOpen={() => setFeedbackOpen(true)} />
    </div>
  );
};
