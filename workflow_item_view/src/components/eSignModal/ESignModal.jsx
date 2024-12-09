import React, { useState, useEffect } from "react";
import {
  Flex,
  TextField,
  Button,
  Modal,
  ModalContent,
  Text,
} from "monday-ui-react-core";
import { Check } from "monday-ui-react-core/icons";
import { getPin } from "../../apis/mondayAPIs";

/* n.b. due to the low security nature of the current
    pin method (i.e. you can just click "show pin reminder")
    this form does not attempt to be secure against hacking.

    It does serve to prevent users from progressig workflows
    without being consious that they have to sign the action.
*/
const ESignatureForm = ({ action, onSubmit, sessionToken }) => {
  const [loading, setLoading] = useState(true);
  const [pin, setPin] = useState("");
  const [userPin, setUserPin] = useState("");

  useEffect(() => {
    getPin(sessionToken).then((res) => {
      setPin(res.pin);
      setLoading(false);
    });
  }, [sessionToken]);

  const pinValid = !loading && userPin === pin;
  return (
    <Flex
      direction={Flex.directions.COLUMN}
      gap={Flex.gaps.MEDIUM}
      align={Flex.align.STRETCH}
    >
      <Text element="p">
        An e-signature is required to mark the item as "{action.title}" and will
        move this item to "{action.newState}". Enter your pin to continue
      </Text>
      <Flex
        direction={Flex.directions.ROW}
        align={Flex.align.START}
        gap={Flex.gaps.SMALL}
      >
        <TextField
          onChange={(value) => setUserPin(value)}
          style={{ width: "100px" }}
          validation={{
            status: pinValid ? "success" : null,
            text: (
              <button onClick={() => alert(`Your pin is ${pin}`)}>
                Get PIN reminder
              </button>
            ),
          }}
          iconName={pinValid ? Check : null}
          type={TextField.types.PASSWORD}
          size={TextField.sizes.LARGE}
          placeholder="Enter your PIN"
          loading={loading}
          onKeyDown={(e) =>
            e.key === "Enter" && pinValid && onSubmit(action, userPin)
          }
          autoFocus
        />
        <Button
          size={Button.sizes.LARGE}
          disabled={!pinValid}
          onClick={() => onSubmit(action, userPin)}
        >
          Sign
        </Button>
      </Flex>
    </Flex>
  );
};

export const ESignModal = ({
  show,
  setClosed,
  action,
  onSubmit,
  sessionToken,
}) => {
  return (
    <Modal
      show={show}
      contentSpacing
      onClose={setClosed}
      title="ESignature Required"
      triggerElement={null}
    >
      <ModalContent>
        {!!action && (
          <ESignatureForm
            action={action}
            onSubmit={onSubmit}
            sessionToken={sessionToken}
          />
        )}
      </ModalContent>
    </Modal>
  );
};
