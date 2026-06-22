import { lazy, Suspense } from 'react';
import { useBuildingContext } from '../../context/BuildingContext';

const StudioFloor    = lazy(() => import('./StudioFloor'));
const RiskLabFloor   = lazy(() => import('./RiskLabFloor'));
const DetectiveFloor = lazy(() => import('./DetectiveFloor'));
const VaultFloor     = lazy(() => import('./VaultFloor'));
const RooftopFloor   = lazy(() => import('./RooftopFloor'));

export default function FloorScene() {
  const { phase } = useBuildingContext();

  const Floor =
    phase === 'floor_studio'    ? StudioFloor    :
    phase === 'floor_risk'      ? RiskLabFloor   :
    phase === 'floor_detective' ? DetectiveFloor :
    phase === 'floor_vault'     ? VaultFloor     :
    phase === 'rooftop'         ? RooftopFloor   :
    null;

  if (!Floor) return null;
  return (
    <Suspense fallback={null}>
      <Floor />
    </Suspense>
  );
}
