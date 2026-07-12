export type RequestPriority = "Normal" | "High";

export type WorkflowRequest = {
  requester: string;
  type: "Software access" | "Equipment" | "Training";
  priority: RequestPriority;
  details: string;
};

export function runWorkflow(request: WorkflowRequest) {
  const needsReview = request.priority === "High" || request.type === "Equipment";
  return [
    { step: "Intake", detail: "Required fields validated", status: "complete" },
    { step: "Classification", detail: `${request.type} · ${request.priority} priority`, status: "complete" },
    { step: "Policy check", detail: needsReview ? "Manager review required" : "Auto-approved by sample policy", status: needsReview ? "review" : "complete" },
    { step: "Notification", detail: `Mock confirmation prepared for ${request.requester}`, status: "complete" },
  ];
}
