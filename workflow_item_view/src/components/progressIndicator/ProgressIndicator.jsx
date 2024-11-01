import React from "react";
import {
  Chips,
  BreadcrumbsBar,
  BreadcrumbItem,
  Text,
} from "monday-ui-react-core";
import { Check, Bolt } from "monday-ui-react-core/icons";
import "./ProgressIndicator.css";

export const ProgressIndicator = ({ state, desiredStateFlow, stateInfo }) => {
  const stateInFlow = desiredStateFlow.includes(state);
  const stateIndex = desiredStateFlow.indexOf(state);

  return (
    <>
      <BreadcrumbsBar
        className="progressBar"
        type={BreadcrumbsBar.types.INDICATION}
      >
        {desiredStateFlow.map((state, index) => {
          const stateIsCurrent = index === stateIndex;
          const stateIsPast = index < stateIndex;

          // let color = Chips.colors.WINTER;
          // if (stateIsCurrent) {
          //   color = Chips.colors.EGG_YOLK;
          // }
          // if (stateInFlow && stateIsPast) {
          //   // eslint-disable-next-line no-unused-vars
          //   color = Chips.colors.DONE_GREEN;
          // }

          let icon = null;
          if (stateIsPast) {
            icon = Check;
          }
          if (stateIsCurrent) {
            icon = Bolt;
          }

          return (
            <BreadcrumbItem
              className={
                stateIsCurrent ? "current" : stateIsPast ? "past" : "future"
              }
              key={state}
              text={state}
              icon={icon}
              isCurrent={stateIsCurrent || stateIsPast}
            />
          );
        })}
      </BreadcrumbsBar>
      {!stateInFlow && (
        <>
          <Text>
            This item is outside of the normal flow and is in this state:
          </Text>
          <Chips label={state} readOnly />
        </>
      )}
    </>
  );
};
