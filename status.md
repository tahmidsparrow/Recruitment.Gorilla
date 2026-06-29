# Status Workflow Rules

## Statuses
- Reject
- Call for Interview
- Interview Scheduled
- Not Available
- Technical Assessment
- Submission Receieved
- Code Review
- Interview Completed
- Recommended
- No Submission
- Not Recommended
- Discontinued
- Ask for Assesment

## Initial Status
- Allowed initial statuses: Uploaded, Not Available, Reject, Discontinued

## Transitions
- Ask for Assesment -> Technical Assessment, Not Available, Discontinued
- Technical Assessment -> Submission Receieved, No Submission, Not Available, Discontinued
- Submission Receieved -> Code Review
- Code Review -> Call for Interview, Not Recommended, Not Available, Discontinued
- Call for Interview -> Interview Scheduled, Not Available, Discontinued
- Interview Scheduled -> Interview Completed, Not Available, Discontinued
- Interview Completed -> Recommended, Not Recommended, Not Available, Discontinued
- Recommended -> Discontinued
- Not Recommended -> Discontinued
- Not Available -> Discontinued

## Prerequisites
- Technical Assessment requires: task assigned/comment required
- Submission Receieved requires: submission link or file
- Code Review requires: Submission Receieved already exists
- Interview Scheduled requires: interview date/time
- Interview Completed requires: Interview Scheduled already exists/comment required
- Recommended requires: Code Review or Interview Completed already exists
- Reject / Discontinued requires: comment required

## UI Behavior
- Disable invalid next statuses in dropdown, or hide them? --> Hide them
- Show prerequisite fields dynamically? --> Yes
- Should admins be allowed to override rules? --> for Now no