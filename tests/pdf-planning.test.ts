import { describe,expect,it } from "vitest";
import { capabilityRegistry } from "../src/capabilities/index.js";
import { normalizePdfPlan, pdfPlanWorkflowCapability, validatedPdfActionParams } from "../src/capabilities/pdf/plan-workflow.js";

const example=(actions:Array<{actionId:any;paramsJson:string}>):any=>({
  schemaVersion:1,title:"Prepare PDF",rationale:"Local PDF actions for review.",actions,notes:[]
});
describe("F8 PDF Luna capability",()=>{
  it("is scoped only to the PDF app and limited by its own budget",()=>{
    expect(capabilityRegistry.get("pdf.planWorkflow")).toBe(pdfPlanWorkflowCapability);
    expect(pdfPlanWorkflowCapability.allowedApps).toEqual(["pdf"]);
    expect(pdfPlanWorkflowCapability.limits.requestsPerMinute).toBe(5);
    expect(pdfPlanWorkflowCapability.limits.requestsPerDay).toBe(40);
    expect(pdfPlanWorkflowCapability.inputSchema.safeParse({goal:"x"}).success).toBe(false);
    expect(pdfPlanWorkflowCapability.inputSchema.safeParse({goal:"rotate pages",password:"secret"}).success).toBe(false);
    expect(pdfPlanWorkflowCapability.buildPrompt({goal:"Rotate pages"}).input).toBe('{"goal":"Rotate pages"}');
  });
  it("normalizes valid actions but never grants execution or consent",()=>{
    const data=normalizePdfPlan(example([
      {actionId:"pdf.rotate",paramsJson:'{"degrees":90}'},
      {actionId:"pdf.split.fixed",paramsJson:'{"pagesPerFile":5}'}
    ]));
    expect(data.actions).toEqual([
      {actionId:"pdf.rotate",params:{degrees:90}},
      {actionId:"pdf.split.fixed",params:{pagesPerFile:5}}
    ]);
    expect(JSON.stringify(data)).not.toContain("approvedRisks");
    expect(data.schemaVersion).toBe(1);
  });
  it("rejects unknown params and unsafe numeric/string data",()=>{
    expect(()=>validatedPdfActionParams("pdf.optimize",{execute:true})).toThrow();
    expect(()=>validatedPdfActionParams("pdf.rotate",{degrees:"90"})).toThrow();
    expect(()=>validatedPdfActionParams("pdf.crop",{topMm:NaN,rightMm:0,bottomMm:0,leftMm:0})).toThrow();
    expect(()=>validatedPdfActionParams("pdf.pages.blank",{position:"end",count:50,widthMm:210,heightMm:297})).toThrow();
    expect(()=>validatedPdfActionParams("pdf.decorate",{watermarkText:"\\u0000",headerText:"",footerText:"",pageNumbers:true,startNumber:1,fontLanguage:"auto"})).not.toThrow();
  });
  it("rejects terminal exports before remaining PDF actions",()=>{
    const output=example([{actionId:"pdf.pages.images",paramsJson:'{"quality":"high"}'},{actionId:"pdf.optimize",paramsJson:"{}"}]);
    expect(pdfPlanWorkflowCapability.validateOutput?.({goal:"export"},output)).toMatch(/last action/);
  });
  it("rejects AI outputs with approval flags or non-JSON params",()=>{
    expect(pdfPlanWorkflowCapability.outputSchema.safeParse(example([{actionId:"pdf.optimize",paramsJson:"{}",approvedRisks:["metadata-removal"]}])).success).toBe(false);
    expect(()=>normalizePdfPlan(example([{actionId:"pdf.optimize",paramsJson:"not-json"}]))).toThrow(/Invalid JSON/);
    expect(()=>normalizePdfPlan(example([{actionId:"pdf.metadata.remove",paramsJson:'{"shell":"run"}'}]))).toThrow(/Unsupported/);
  });
});
