import React from "react";

export const TextBR = ({ content }) => {
  const lines = content.split("\n");
  return (
    <>
      {lines.map((line, index) => (
        <React.Fragment key={index}>
          {line}
          {index !== lines.length - 1 && <br />}
        </React.Fragment>
      ))}
    </>
  );
};
