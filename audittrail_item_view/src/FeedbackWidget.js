import React from "react";
import { useState } from "react";
import { Button, Modal, ModalContent, Text } from "monday-ui-react-core";
import mondaySdk from "monday-sdk-js";

const monday = mondaySdk();
monday.setApiVersion("2023-10");

const FeedbackModal = ({
  show,
  setClosed,
  documentationLink,
  supportEmail,
}) => {
  const [version, setVersion] = useState(null);
  monday.listen(
    "context",
    (res) => {
      const version = res.data?.appVersion?.versionData;
      setVersion(`${version.major}.${version.minor}.${version.patch}`);
    },
    []
  );

  return (
    <Modal
      show={show}
      contentSpacing
      onClose={setClosed}
      title="Help and Feedback"
      triggerElement={null}
    >
      <ModalContent>
        <Text element="p">
          We're always looking to help you achieve the most with Eurotas apps.
          Contact us for support or with ideas for improvements which would
          improve your experience.
        </Text>
        <Text element="p">
          <a href={documentationLink} target="_blank" rel="noreferrer">
            Install instructions
          </a>
        </Text>
        <Text element="p">
          Email us:{" "}
          <a target="_blank" rel="noreferrer" href={`mailto:${supportEmail}`}>
            {supportEmail}
          </a>
        </Text>
        <Text element="p">Version {version ? `v${version}` : "unknown"}</Text>
      </ModalContent>
    </Modal>
  );
};

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
      <FeedbackModal
        show={feedbackOpen}
        setClosed={() => setFeedbackOpen(false)}
        documentationLink={documentationLink}
        supportEmail={supportEmail}
      />
      <FeedbackButton setOpen={() => setFeedbackOpen(true)} />
    </div>
  );
};
