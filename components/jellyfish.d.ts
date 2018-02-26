/** A collection of methods that may be used to create renders of a jellyfish species. */
export type renderer = {
  /** A method that will calculate a plaintext representation of this jellyfish. */
  plaintext: (source: jellyfish) => string;
  /** A method that will calculate an html single node (ie valid xml) representation, will default to plaintext. */
  html?: (source: jellyfish) => string;
  /** A method that will calculate a markdown representation, will default to plaintext. */
  markdown?: (source: jellyfish) => string;
};

/** A collection of actions that may be applied to a jellyfish species. */
export type action = {
  /** A short name for this action, like what might be rendered in a <button> for example. */
  name: string;
  /** The method, possibly asynchronous, to perform. */
  method: (target: jellyfish, payload: any) => Promise<void>;
  /** A criteria under which this action may be performed, if unspecified the codebase will assume it can always occur. */
  filter?: (focus: jellyfish) => boolean;
};

/** A bunching of similar types of jellyfish into coherent types. */
export type species = {
  /** A short name for this species. */
  name: string;
  /** A list of render functions that this species will require. */
  renderers: {
    /** For use in a list of jellyfish or inside a short review.  e.g. "Our enterprise customers are John Doe and Joe Bloggs" or "Joe Bloggs created help request 'argh!'" */
    title: renderer;
    /** For use inside the tail of another jellyfish.  e.g. "Joe Bloggs created help request 'argh!'" */
    short: renderer;
    /** For the head section of a jellyfish.  e.g. "# Joe Bloggs\ntier = enterprise" */
    full: renderer;
  }
  /** A list of possible actions that may happen to this type of jellyfish, if unspecified will assume nothing can happen, ie empty array. */
  actions?: action[]
}

/** An individual data item within the ocean. */
export type jellyfish = {
  /** Because everything needs an ID. */
  uuid: string;
  /** How this jellyfish may be viewed and interacted with. */
  species: species;
  /** A timestamp for when this jellyfish was created. */
  created: DateTime;
  /** The actual payload aka head of the jellyfish, delegates to the inheriting class to decide the schema. */
  data: any;
  /** A list of jellyfish that relate to this jellyfish, and why. */
  related: {
    /** An array of events that have happened to this jellyfish.
     * Interestingly an event can be considered as an entity with connections and data, and is potentially just a short rendered jellyfish
     */
    events: jellyfish[];
    [relationship: string]: jellyfish[];
  }
}
