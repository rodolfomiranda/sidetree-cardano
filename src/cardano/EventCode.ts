/**
 * Event codes used by Cardano Processor.
 */
export default {
  CardanoDatabasesRevert: 'cardano_processor_databases_revert',
  CardanoLockMonitorLockReleased: `cardano_lock_monitor_lock_released`,
  CardanoLockMonitorLockRenewed: `cardano_lock_monitor_lock_renewed`,
  CardanoLockMonitorNewLock: `cardano_lock_monitor_new_lock`,
  CardanoLockMonitorLoopFailure: `cardano_lock_monitor_loop_failure`,
  CardanoLockMonitorLoopSuccess: `cardano_lock_monitor_loop_success`,
  CardanoObservingLoopFailure: 'cardano_observing_loop_failure',
  CardanoObservingLoopSuccess: `cardano_observing_loop_success`
};
