"use client";

import { createContext, useContext } from "react";

export type RevealStyle = {
  titles?: "sweep";
  text?: "static";
  boxes?: "opacity";
};

const RevealStyleContext = createContext<RevealStyle>({});

export const RevealStyleProvider = RevealStyleContext.Provider;

export const useRevealStyle = () => useContext(RevealStyleContext);
