import { Flex } from "monday-ui-react-core";

export const CenterContent = ({ children }) => (
  <Flex
    align="Center"
    justify="Center"
    style={{ height: "100vh", width: "100vw" }}
  >
    {children}
  </Flex>
);
