/**
 * The exercise bank is one, shared by every group in the app: no group owns
 * it. Exercises, versions, observations, patterns, proposals and the log of
 * changes to exercises are stored with this id in `spond_group_id`, while
 * plans, evaluations, learnings and team settings belong to the team's group.
 * Trainers reach the bank through their own group, which the store checks.
 */
export const BANK = "felles";
