import React from 'react';
import { Composition } from 'remotion';
import { PmoPresentation } from './PmoPresentation';

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="PmoExecutiveBrief"
      component={PmoPresentation}
      durationInFrames={3900}
      fps={30}
      width={1920}
      height={1080}
      defaultProps={{
        externalCctvFile: undefined,
      }}
    />
  );
};
