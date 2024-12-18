import { Modal, ModalContent, Text } from "monday-ui-react-core";
import mondaySdk from "monday-sdk-js";
import { useState } from "react";

const monday = mondaySdk();
monday.setApiVersion("2023-10");

const HelpModal = ({ show, setClosed, documentationLink, supportEmail }) => {
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

export default HelpModal;
