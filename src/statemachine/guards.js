import { ACTION_SOURCE } from "../constants/general.js";

export const hasRequiredFields =
  (requiredFields, contextKey = "item") =>
  (context) => {
    const missingFields = requiredFields.filter(
      // TODO: enhance this for other field types
      (field) => {
        const col_value = context[contextKey].column_values[field];
        if (col_value?.text) {
          return !col_value.text;
        }
        return true;
      }
    );
    if (missingFields.length > 0) {
      const titles = missingFields.map(
        (field) =>
          context[contextKey].column_values[field]?.column.title ||
          `${field} (missing)`
      );
      return {
        success: false,
        reasons: [`Please set the required fields: ${titles.join(", ")}`],
      };
    }
    return { success: true };
  };

export const userAssignedInField =
  (fields, contextKey = "item") =>
  async (context) => {
    const user = context.user;

    // We'll allow if the user is directly assigned to the item, or if they are in a team that is assigned to the item
    const acceptableUserOrGroups = [
      user.id,
      ...user?.teams?.map((team) => team?.id),
    ];

    // Get the Ids of the people inside the Lead Auditor and Co-Auditors Mirror fields from Audit
    const mirroColsIds =
      context?.item.column_values?.mirror_1__1?.mirrored_items[0]?.linked_item?.column_values?.flatMap(
        (col) => col?.persons_and_teams?.map((person) => person?.id)
      );

    // Get all the people or teams assigned to the item
    // n.b. also works for the creation log field which has the `originator`
    const itemColIds = fields.flatMap(
      (field) =>
        context[contextKey]?.column_values[field]?.persons_and_teams?.map(
          (person_or_team) => person_or_team?.id
        ) || [context[contextKey]?.column_values[field]?.creator?.id]
    );

    // Get a boolean for if there is some overlap - this indicates a user is in the required group or assigned
    const hasOverlap = acceptableUserOrGroups.some(
      (group) => itemColIds?.includes(group) || mirroColsIds?.includes(group)
    );

    if (!hasOverlap) {
      const colTitles = fields.map(
        (field) => context[contextKey].column_values[field].column.title
      );

      return {
        success: false,
        reasons: [
          `Only users assigned in "${colTitles.join(
            '", "'
          )}" can perform this action`,
        ],
      };
    }
    return { success: true };
  };

export const hasConnectedItem = (contextKey, field, message) => {
  return (context) => {
    if (!context[contextKey].column_values[field]?.linked_item_ids?.length) {
      return {
        success: false,
        reasons: [message],
      };
    }
    return { success: true };
  };
};

export const hasNoConnectedItem = (contextKey, field, message) => {
  return (context) => {
    if (context[contextKey].column_values[field]?.linked_item_ids?.length) {
      return {
        success: false,
        reasons: [message],
      };
    }
    return { success: true };
  };
};

export const requireSourceType = (
  sourceType,
  messageGetter = null,
  contextKey = "source"
) => {
  return (context) => {
    if (context[contextKey] !== sourceType) {
      const defaultMessage = `This action can only be triggered by ${sourceType}`;
      const message = messageGetter ? messageGetter(context) : defaultMessage;
      return {
        success: false,
        hide: true,
        reasons: [message],
      };
    }
    return { success: true };
  };
};

export const requireESignature = (context) => {
  if (context.isCheckOnly || !context.esignEnabled) {
    return { success: true };
  }
  if (!context.hasPin) {
    return {
      success: false,
      reasons: ["This action requires an e-signature"],
    };
  }
  if (!context.pinValid) {
    return {
      success: false,
      reasons: ["Invalid PIN provied for e-signature"],
    };
  }
  return { success: true };
};

// If there are no linked items, we can allow the submit by the user, else it can only be done by the system
export const allowSubmitIfStandalone =
  (linkedItemsGetter, failureReasonGetter, standaloneFallbackGuard) =>
  (context) => {
    const linkedItems = linkedItemsGetter(context);
    const isStandalone = !linkedItems || !linkedItems.length;
    if (isStandalone) {
      // Fallback to only allowing the originator to submit
      return standaloneFallbackGuard(context);
    }

    if (context.source !== ACTION_SOURCE.SYSTEM) {
      return {
        success: false,
        reasons: [failureReasonGetter(context)],
      };
    }

    return { success: true };
  };

// Given a pair of "people" fields ensure there's no overlap and show a
// warning if there is.
// This guard is unique in that it's only advisory.
export const preventAssignedUserPerformingAction = (
  fieldA,
  fieldB,
  warningMessageGetter = false
) => {
  const getUsersOrTeams = (context, field) => {
    // if (field === "mirror7__1") {
    //   const PERSONS_AND_TEAMS_ARRAY =
    //     context.item.column_values.mirror7__1.mirrored_items[0].linked_item.column_values.map(
    //       (val) => val?.persons_and_teams[0]
    //     );

    //   console.log("PERSONS_AND_TEAMS_ARRAY", PERSONS_AND_TEAMS_ARRAY);

    //   return PERSONS_AND_TEAMS_ARRAY.map((val) => val?.id);
    // } else

    // if (field === "mirror_1__1") {
    //   const PERSONS_AND_TEAMS_ARRAY =
    //     context.item.column_values.mirror_1__1.mirrored_items[0].linked_item.column_values.map(
    //       (val) => val?.persons_and_teams[0]
    //     );

    //   return PERSONS_AND_TEAMS_ARRAY.map((val) => val?.id);
    // }
    if (field === "mirror_1__1") {
      const PERSONS_AND_TEAMS_ARRAY =
        context.item.column_values.mirror_1__1.mirrored_items[0].linked_item
          .column_values[0].persons_and_teams;

      return PERSONS_AND_TEAMS_ARRAY.map((val) => val?.id);
    }

    return context.item.column_values[field].persons_and_teams.map(
      (val) => val?.id
    );
  };

  const defaultMessageGetter = (context) =>
    'There is overlap between the people in the "Auditee" and the "Lead Auditor" columns. For compliance reasons, one must not  approve their own work.';

  return (context) => {
    const usersOrTeamsA = getUsersOrTeams(context, fieldA);
    const usersOrTeamsB = getUsersOrTeams(context, fieldB);

    console.log("usersOrTeamsA", usersOrTeamsA);
    console.log("usersOrTeamsB", usersOrTeamsB);

    const overlap = usersOrTeamsA.some((id) => usersOrTeamsB.includes(id));
    if (overlap) {
      return {
        success: false,
        reasons: [
          !!warningMessageGetter
            ? warningMessageGetter(context)
            : defaultMessageGetter(context),
        ],
      };
    }

    return { success: true };
  };
};
