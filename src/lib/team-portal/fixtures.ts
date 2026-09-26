import { emptyFeedback, type DemoPlayer, type DemoState } from "./types";
import { emptyObservation } from "./observationTypes";

const players: DemoPlayer[] = [
  { id: "p1", name: "Milan", number: 8, position: "Middenvelder", qualities: ["Spelverdeler", "Teamspeler"], motto: "Samen maken we het verschil." },
  { id: "p2", name: "Noor", number: 1, position: "Keeper", qualities: ["Rots in de branding", "Coacht het team"], motto: "Ik sta achter mijn team." },
  { id: "p3", name: "Sam", number: 4, position: "Verdediger", qualities: ["Oog voor ruimte", "Rust aan de bal"], motto: "Eerst kijken, dan spelen." },
  { id: "p4", name: "Yara", number: 5, position: "Verdediger", qualities: ["Doorzetter", "Sterke duels"], motto: "Elke bal is een nieuwe kans." },
  { id: "p5", name: "Finn", number: 6, position: "Middenvelder", qualities: ["Verbindt het team", "Mooie passes"], motto: "De beste pass is naar elkaar." },
  { id: "p6", name: "Dani", number: 10, position: "Middenvelder", qualities: ["Creatief", "Ziet de opening"], motto: "Durf iets nieuws te proberen." },
  { id: "p7", name: "Mees", number: 9, position: "Aanvaller", qualities: ["Doelgericht", "Blijft proberen"], motto: "Ook na een misser ga ik door." },
  { id: "p8", name: "Robin", number: 3, position: "Verdediger", qualities: ["Behulpzaam", "Goed in de dekking"], motto: "We helpen elkaar vooruit." },
  { id: "p9", name: "Jay", number: 7, position: "Aanvaller", qualities: ["Snel op de flank", "Brengt energie"], motto: "Met plezier kom je verder." },
  { id: "p10", name: "Isa", number: 11, position: "Aanvaller", qualities: ["Durft te dribbelen", "Sportief"], motto: "Een glimlach hoort erbij." },
  { id: "p11", name: "Luca", number: 12, position: "Keeper", qualities: ["Snelle reflexen", "Moedigt aan"], motto: "Ik ben klaar voor de volgende bal." },
  { id: "p12", name: "Bo", number: 2, position: "Verdediger", qualities: ["Sterk in samenwerken", "Leergierig"], motto: "Elke week een stapje verder." },
];

export function createDemoState(now: number): DemoState {
  const participantIds = players.map((player) => player.id);
  const development = {
    ...emptyFeedback(),
    compliment: "Je kijkt steeds vaker om je heen voordat je de bal krijgt. Daarmee maak je het voor het hele team makkelijker.",
    nextStep: "Kijk vóór iedere aanname één keer over je schouder. Probeer het ook op de training!",
    skills: { ...emptyFeedback().skills, samenspel: "Sterk punt" as const, spelinzicht: "Steeds vaker zichtbaar" as const, inzet: "Sterk punt" as const },
  };
  const matchFeedback = {
    ...emptyFeedback(),
    compliment: "Mooie pass op Isa! Je bleef rustig en zag precies waar de ruimte lag.",
    nextStep: "Loop na je pass meteen weer vrij, zodat je de bal terug kunt krijgen.",
  };
  const staffExample = emptyObservation(new Date(now - 86400000).toISOString().slice(0, 10), "m2");
  staffExample.position = "Centrale middenvelder · opbouwende rol";
  staffExample.confidence = "Meerdere momenten";
  staffExample.criteria.scanning = { level: "Passend bij de rol", evidence: "Rond minuut 12 en 24 keek Milan vóór de aanname over beide schouders en speelde vervolgens vooruit." };
  staffExample.criteria.transition = { level: "In ontwikkeling", evidence: "Na balverlies in minuut 28 bleef Milan even staan; na een aanwijzing koos hij weer positie achter de bal." };
  staffExample.strengths = "Herkenning van vrije ruimte en rustige uitvoering in de opbouw.";
  staffExample.development = "De eerste reactie na balverlies is nog wisselend. Opnieuw bekijken in een andere wedstrijdcontext.";
  staffExample.followUp = "Gericht observeren in een partijvorm met snelle omschakelingen; daarna vergelijken met een volgende wedstrijd.";
  return {
    version: 1,
    observationsEnabled: false,
    observations: [{ id: "observation-example", playerId: "p1", authorRole: "scout", status: "final", content: staffExample, createdAt: now - 86400000, updatedAt: now - 86400000 }],
    players: structuredClone(players),
    guardians: [{ id: "family1", name: "Familie De Vries", childrenIds: ["p1", "p10"] }],
    matches: [
      { id: "m1", opponent: "Groenwit JO13", dateLabel: "Vandaag · oefenwedstrijd", score: "3 – 2", phase: "preparing", participantIds },
      { id: "m2", opponent: "Blauwbrug JO13", dateLabel: "Gisteren · oefenwedstrijd", score: "2 – 2", phase: "voting", participantIds, openedAt: now - 4 * 3600000, closesAt: now + 20 * 3600000, playerCandidateIds: participantIds, highlightCandidateIds: ["h3", "h4"] },
      { id: "m3", opponent: "Duinrand JO13", dateLabel: "Vorige week · oefenwedstrijd", score: "4 – 1", phase: "closed", participantIds, openedAt: now - 7 * 86400000, closesAt: now - 6 * 86400000, playerCandidateIds: participantIds, highlightCandidateIds: ["h5", "h6"] },
    ],
    feedback: [
      { id: "f1", playerId: "p1", kind: "periodic", draft: development, published: structuredClone(development), publishedAt: now - 86400000, updatedAt: now - 86400000 },
      { id: "f2", playerId: "p1", kind: "match", matchId: "m3", draft: matchFeedback, published: structuredClone(matchFeedback), publishedAt: now - 6 * 86400000, updatedAt: now - 6 * 86400000 },
      { id: "f3", playerId: "p10", kind: "periodic", draft: { ...emptyFeedback(), compliment: "Je durft een actie te maken en gunt een ander de bal. Dat is fijn samenspelen!", nextStep: "Probeer vóór je dribbel te kijken waar je teamgenoten staan." }, published: null, updatedAt: now },
    ],
    highlights: [
      { id: "h1", matchId: "m1", playerId: "p2", category: "Redding", description: "Noor bleef goed kijken en tikte een hoge bal over de lat.", minute: 18, status: "approved", submittedBy: "coach" },
      { id: "h2", matchId: "m1", playerId: "p4", category: "Doorzetten", description: "Yara sprintte terug en hielp Sam de aanval te stoppen.", minute: 42, status: "pending", submittedBy: "p1" },
      { id: "h3", matchId: "m2", playerId: "p5", category: "Mooie pass", description: "Finn vond Jay met een pass tussen twee tegenstanders door.", minute: 25, status: "approved", submittedBy: "coach" },
      { id: "h4", matchId: "m2", playerId: "p11", category: "Sportiviteit", description: "Luca hielp een tegenstander overeind en gaf hem een boks.", minute: 38, status: "approved", submittedBy: "coach" },
      { id: "h5", matchId: "m3", playerId: "p1", category: "Mooie pass", description: "Milan keek op, speelde Isa vrij en liep meteen weer mee.", minute: 22, status: "approved", submittedBy: "coach" },
      { id: "h6", matchId: "m3", playerId: "p8", category: "Verdedigen", description: "Robin pakte de bal af en bouwde rustig weer op.", minute: 46, status: "approved", submittedBy: "coach" },
    ],
    votes: [
      { matchId: "m2", voterId: "p3", kind: "player", targetId: "p5", reason: "Goed samengespeeld" },
      { matchId: "m2", voterId: "p3", kind: "highlight", targetId: "h3" },
      { matchId: "m3", voterId: "p2", kind: "player", targetId: "p1", reason: "Hielp het team" },
      { matchId: "m3", voterId: "p4", kind: "player", targetId: "p1", reason: "Goed samengespeeld" },
      { matchId: "m3", voterId: "p5", kind: "player", targetId: "p8", reason: "Sterk verdedigd" },
      { matchId: "m3", voterId: "p2", kind: "highlight", targetId: "h5" },
      { matchId: "m3", voterId: "p4", kind: "highlight", targetId: "h5" },
    ],
  };
}
