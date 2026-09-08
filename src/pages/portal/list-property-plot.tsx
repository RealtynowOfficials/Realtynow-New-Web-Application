import React from 'react';
import { ListPropertyWizard } from './list-property';

/**
 * OpenPlotWizard - unified into the Universal 3-Step Property Flow.
 * Pre-selects the 'open-plots-land' category.
 */
export function OpenPlotWizard() {
  return <ListPropertyWizard initialCategory="open-plots-land" />;
}

export default OpenPlotWizard;
