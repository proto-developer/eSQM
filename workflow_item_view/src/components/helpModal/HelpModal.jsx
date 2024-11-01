import { Modal, ModalContent, Text } from "monday-ui-react-core";

const HelpModal = ({ show, setClosed }) => {
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
          <a href="https://www.google.com" target="_blank" rel="noreferrer">
            Install instructions
          </a>
        </Text>
        <Text element="p">
          Email us:{" "}
          <a
            target="_blank"
            rel="noreferrer"
            href={`mailto:developer@protogroup.co`}
          >
            developer@protogroup.co
          </a>
        </Text>
        <Text element="p">Version 1.25.0</Text>
      </ModalContent>
    </Modal>
  );
};

export default HelpModal;
