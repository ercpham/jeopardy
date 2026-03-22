import React, { createContext, useContext, useState, ReactNode } from "react";

interface PageContextType {
  isHomePage: boolean;
  setIsHomePage: (value: boolean) => void;
}

const PageContext = createContext<PageContextType | undefined>(undefined);

export const PageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isHomePage, setIsHomePage] = useState(true);

  return (
    <PageContext.Provider value={{ isHomePage, setIsHomePage }}>
      {children}
    </PageContext.Provider>
  );
};

export const usePage = (): PageContextType => {
  const context = useContext(PageContext);
  if (!context) {
    throw new Error("usePage must be used within a PageProvider");
  }
  return context;
};
