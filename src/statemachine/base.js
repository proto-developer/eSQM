import _ from "lodash";
import { requireESignature } from "./guards.js";

export class WorkflowStateMachine {
  constructor(
    transitions,
    requiredContextKeys,
    statePath,
    actionNames,
    desiredStateFlow
  ) {
    this.transitions = transitions; // This should define all possible transitions and associated guards/effects
    this.requiredContextKeys = requiredContextKeys;
    this.statePath = statePath;
    this.actionNames = actionNames;
    this.desiredStateFlow = desiredStateFlow;
  }

  async canPerformTransition(transition, context) {
    const { guards } = transition;
    const reasons = [];
    if (!guards) return { canPerformAction: true, reasons };

    // Inject the e-signature guard if set
    // Done here because it's required on so many items
    if (transition.requiresESignature && !guards.includes(requireESignature)) {
      guards.push(requireESignature);
    }

    const canPerformAction = (
      await Promise.all(
        guards.map(async (guard) => {
          const result = await guard(context);
          if (!result.success) {
            reasons.push(...result.reasons);
          }
          return result.success;
        })
      )
    ).every((result) => result === true);

    return {
      canPerformAction,
      reasons,
    };
  }

  async checkTransition(action, context) {
    const currentState = _.get(context, this.statePath);
    const stateTransitions = this.transitions[currentState];
    if (!stateTransitions) {
      console.error(
        `Invalid current state ${currentState} in checkTransition method of WorkflowStateMachine`
      );
      return { success: false, reasons: ["Invalid current state"], context };
    }

    const transition = stateTransitions[action];
    if (!transition) {
      const allowedActions = this.validTransitions(currentState).join(", ");
      console.error(
        `Invalid action, allowed actions: ${JSON.stringify(allowedActions)}`
      );
      return {
        success: false,
        reasons: [
          `Invalid action. Allowed actions: ${JSON.stringify(allowedActions)}`,
        ],
        context,
      };
    }

    return await this.canPerformTransition(transition, context);
  }

  async performAction(action, context) {
    // Check if all required keys are present in the context object
    const missingKeys = this.requiredContextKeys.filter(
      (key) => !(key in context)
    );
    if (missingKeys.length > 0) {
      console.error(`Missing required keys: ${missingKeys.join(", ")}`);
      return { success: false, reasons: ["Internal Error"], context };
    }

    const currentState = _.get(context, this.statePath);

    context.messages = context.messages || [];

    const stateTransitions = this.transitions[currentState];

    if (!stateTransitions) {
      console.error(
        "Invalid current state:",
        currentState,
        "in performAction method of WorkflowStateMachine. Context: ",
        context
      );
      return { success: false, reasons: ["Invalid current state"], context };
    }

    const transition = stateTransitions[action];

    if (!transition) {
      const allowedActions = this.validTransitions(currentState).join(", ");
      console.error(
        `Invalid action, allowed actions: ${JSON.stringify(allowedActions)}`
      );
      return {
        success: false,
        reasons: [
          `Invalid action. Allowed actions: ${JSON.stringify(allowedActions)}`,
        ],
        context,
      };
    }
    context.transition = transition;

    // Test that action is allowed
    const { canPerformAction, reasons } = await this.canPerformTransition(
      transition,
      context
    );
    if (!canPerformAction) {
      return { success: false, reasons, context, messages: context.messages };
    }

    // Transition to the new state
    const { effects, newState } = transition;

    _.set(context, this.statePath, newState);

    // create the updates object which will be saved later
    context.updates = context.updates || {};
    context.updates.status__1 = newState;

    // Execute effects if action is allowed
    for (const effect of effects) {
      const result = await effect(context);

      if (!result?.success) {
        return {
          success: false,
          reasons: ["Side-effects failed"],
          context,
          messages: context.messages,
        };
      }
    }

    // In the standard case, we can add a message to the context
    if (context?.item) {
      context.messages.push({
        type: "success",
        message: `Action "${action}" completed. Item ${context.item.name} has been moved to "${newState}".`,
      });
    }

    return {
      success: true,
      prevState: currentState,
      nextState: newState,
      action,
      context,
      updates: context.updates,
      messages: context.messages,
    };
  }

  validTransitions(state) {
    const stateTransitions = this.transitions[state];
    if (!stateTransitions) {
      console.error(
        `Invalid state ${state} in validTransitions method of WorkflowStateMachine`
      );
      return [];
    }

    const transitionsList = Object.entries(stateTransitions).map(
      ([key, value]) => {
        return {
          key: Object.keys(this.actionNames).find(
            (kk) => this.actionNames[kk] === key
          ),
          title: key,
          ...value,
        };
      }
    );

    return transitionsList;
  }

  async validPermittedTransitions(state, context) {
    const transitions = this.validTransitions(state);
    return await Promise.all(
      transitions.map(async (transition) => {
        const { canPerformAction, reasons } = await this.canPerformTransition(
          transition,
          context
        );
        return {
          ...transition,
          canPerformAction,
          unavailableReasons: reasons,
        };
      })
    );
  }

  getActionFromKey(key) {
    return this.actionNames[key];
  }
}
