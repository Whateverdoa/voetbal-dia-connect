import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Id } from "@/convex/_generated/dataModel";
import { MatchPlanAttribution } from "./MatchPlanAttribution";
const mocks=vi.hoisted(()=>({query:vi.fn()}));
vi.mock("convex/react",()=>({useQuery:mocks.query}));
afterEach(cleanup);
describe("match plan attribution",()=>{
 it("labels old plans honestly without guessing their maker",()=>{
  mocks.query.mockReturnValue({lineup:{creator:null,latest:null},plan:{creator:null,latest:null},history:[]});
  render(<MatchPlanAttribution matchId={"match" as Id<"matches">}/>);
  expect(screen.getAllByText("Maker niet geregistreerd")).toHaveLength(2);
  expect(screen.queryByText(/Aangemaakt door/)).not.toBeInTheDocument();
 });
 it("shows creator, last editor and the change history separately",async()=>{
  const max={name:"Max",at:Date.parse("2026-11-06T10:00:00Z"),action:"Formatie gewijzigd"};
  const mike={name:"Mike",at:Date.parse("2026-11-06T11:00:00Z"),action:"Posities geruild"};
  mocks.query.mockReturnValue({lineup:{creator:max,latest:mike},plan:{creator:null,latest:null},history:[{...mike,id:"1",domain:"lineup"}]});
  render(<MatchPlanAttribution matchId={"match" as Id<"matches">}/>);
  expect(screen.getByText(/Aangemaakt door/)).toHaveTextContent("Max");
  expect(screen.getByText(/Laatst gewijzigd door/)).toHaveTextContent("Mike");
  await userEvent.click(screen.getByText("Bekijk laatste wijzigingen"));
  expect(screen.getByText(/Opstelling: Posities geruild/)).toBeVisible();
 });
});
