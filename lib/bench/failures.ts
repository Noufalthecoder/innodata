/**
 * Notes on the hardest scenes: what the image shows, a hypothesis for why models misread it, and what the
 * mistake would cost. Deliberately qualitative. Which models failed, what they answered and the exact
 * geometry are never typed here: they come from the results files and from each task's computed explanation.
 */
export type BiasCategory = "Stability false alarm" | "Orientation answer collapse";

export interface FailureNote {
  title: string;
  category: BiasCategory;
  /** our hypothesis, labelled as such in the UI */
  likelyCause: string;
  impact: string;
}

export const FAILURE_NOTES: Record<string, FailureNote> = {
  s4: {
    title: "Visible ledge, safe stack",
    category: "Stability false alarm",
    likelyCause: "The top box is visibly shifted, leaving an obvious ledge. A model that treats any visible offset as unstable, rather than checking whether the centre of mass is still over the box below, will call it falling.",
    impact: "An inspection camera would flag a safe pallet and stop the line for nothing.",
  },
  s9: {
    title: "Open side faces right",
    category: "Orientation answer collapse",
    likelyCause: "The open side points to the image right, so the camera sees into the container at an angle. Models almost always answer “toward” or “away from” the camera and almost never “left” or “right”.",
    impact: "A gripper planning to reach in would approach from a closed wall.",
  },
  s27: {
    title: "Open side faces right, nearly side-on",
    category: "Orientation answer collapse",
    likelyCause: "The container is turned almost fully side-on and its lit inner wall is clearly visible, which may read as the front of the container.",
    impact: "Bin-picking stations would miss containers loaded sideways.",
  },
  s28: {
    title: "Staircase stack that holds",
    category: "Stability false alarm",
    likelyCause: "The boxes step progressively to one side, which looks precarious, although the combined centre of mass above each level stays well inside its support.",
    impact: "Safely loaded pallets would be rejected, cutting throughput.",
  },
  s34: {
    title: "Tall stack that holds",
    category: "Stability false alarm",
    likelyCause: "Four boxes shift slightly back and forth. Height and the alternating offsets may look unstable, although every level is comfortably supported.",
    impact: "Shows why model judgement cannot yet replace a geometric stability check in a warehouse.",
  },
  s52: {
    title: "Overhanging upper boxes",
    category: "Stability false alarm",
    likelyCause: "The upper boxes overhang one side. Judging each pair of boxes on its own, instead of the combined mass above each level, makes the stack look unstable.",
    impact: "False rejections during automated packing and wrapping checks.",
  },
  s57: {
    title: "Open side faces right, workshop setting",
    category: "Orientation answer collapse",
    likelyCause: "Same pattern as the other right-facing containers: the model defaults to “toward” or “away from” the camera.",
    impact: "Failed grasp planning and dropped parts.",
  },
};
