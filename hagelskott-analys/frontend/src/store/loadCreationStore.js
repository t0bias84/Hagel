import { create } from 'zustand';

const initialState = {
  // (1) Kaliber & hylslängd
  caliber: "12",
  shellLength: "70",

  // Alla komponenter (hämtas från API)
  allComponents: [],

  // Collapsible sections state
  openSections: {
    hull: true,
    primer: false,
    powder: false,
    wad: false,
    shot: false,
    filler: true,
    crimp: true,
    naming: true,
    recoil: false,
  },

  // Valda komponenter
  selectedHull: null,
  hullHasPrimer: false,
  overridePrimer: false,
  selectedPrimer: null,
  selectedPowder: null,
  selectedWad: null,
  selectedShot: null,
  selectedSlug: null,

  // Värden
  powderChargeValue: "",
  powderChargeUnit: "g",
  slugWeightValue: "",
  slugWeightUnit: "g",
  shotWeightValue: "",
  shotWeightUnit: "g",

  // Duplex
  duplexA: null,
  duplexAvalue: "",
  duplexAunit: "g",
  duplexB: null,
  duplexBvalue: "",
  duplexBunit: "g",

  // Skott-typ
  shotType: "lead",

  // Filler
  useFiller: false,
  fillerPosition: "underWad",
  fillerQuantity: "",

  // Crimp
  crimpType: "star",

  // Namn/syfte/taggar
  loadName: "",
  loadPurpose: "",
  tags: [],
  newTag: "",
};

export const useLoadCreationStore = create((set, get) => ({
  ...initialState,

  // Actions
  setField: (field, value) => set({ [field]: value }),

  toggleSection: (section) => set((state) => ({
    openSections: { ...state.openSections, [section]: !state.openSections[section] }
  })),

  setAllComponents: (components) => set({ allComponents: components }),

  selectHull: (hull) => {
    set({ selectedHull: hull });
    const hasPrimerStr = hull.properties?.primer || "";
    if (hasPrimerStr.trim().length > 0) {
      set({
        hullHasPrimer: true,
        selectedPrimer: {
          _id: `inHull:${hull._id}`,
          name: `Inbyggd primer: ${hasPrimerStr}`,
          manufacturer: hull.manufacturer,
        },
        overridePrimer: false,
        openSections: { ...get().openSections, hull: false, primer: false, powder: true }
      });
    } else {
      set({
        hullHasPrimer: false,
        selectedPrimer: null,
        overridePrimer: false,
        openSections: { ...get().openSections, hull: false, primer: true }
      });
    }
  },

  selectPrimer: (primer) => {
    set({
      selectedPrimer: primer,
      openSections: { ...get().openSections, primer: false, powder: true }
    });
  },

  selectPowder: (powder) => {
    set({
      selectedPowder: powder,
      openSections: { ...get().openSections, powder: false, wad: true }
    });
  },

  selectWad: (wad) => {
    set({
      selectedWad: wad,
      openSections: { ...get().openSections, wad: false, shot: true }
    });
  },

  selectShot: (shot) => {
    set({
      selectedShot: shot,
      openSections: { ...get().openSections, shot: false, naming: true }
    });
  },

  selectSlug: (slug) => {
    set({
      selectedSlug: slug,
      openSections: { ...get().openSections, shot: false, naming: true }
    });
  },

  setDuplexA: (component) => set({ duplexA: component }),
  setDuplexB: (component) => set({ duplexB: component }),

  handleShotTypeChange: (newType) => {
    set({
      shotType: newType,
      selectedShot: null,
      selectedSlug: null,
      slugWeightValue: "",
      slugWeightUnit: "g",
      duplexA: null,
      duplexB: null,
      duplexAvalue: "",
      duplexBvalue: "",
      duplexAunit: "g",
      duplexBunit: "g",
      shotWeightValue: "",
      shotWeightUnit: "g",
    });
  },

  toggleTag: (tag) => {
    const currentTags = get().tags;
    if (currentTags.includes(tag)) {
      set({ tags: currentTags.filter((t) => t !== tag) });
    } else {
      set({ tags: [...currentTags, tag] });
    }
  },

  addTag: () => {
    const { newTag, tags } = get();
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      set({ tags: [...tags, newTag.trim()], newTag: "" });
    } else {
      set({ newTag: "" });
    }
  },

  resetForm: () => set(initialState),

}));
