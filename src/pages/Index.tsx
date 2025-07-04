
import React from "react";
import TrailViewer from "@/components/TrailViewer";
import { sampleTrail } from "@/data/sampleTrail";

const Index = () => {
  return (
    <div className="min-h-screen bg-white">
      <TrailViewer trail={sampleTrail} />
    </div>
  );
};

export default Index;
