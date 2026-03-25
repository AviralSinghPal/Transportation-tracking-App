const statusColors = {
  'unassigned': 'blue',
  'assigned': 'yellow',
  'driver-departed': 'yellow',
  'in-progress': 'yellow',
  'completed': 'green',
  'cancelled': 'red',
  'available': 'green',
  'in-use': 'yellow',
  'maintenance': 'red',
  'waiting': 'blue',
  'picked-up': 'yellow',
  'dropped-off': 'green',
  'on-duty': 'green',
  'off-duty': 'gray',
};

const statusLabels = {
  'unassigned': 'Unassigned',
  'assigned': 'Assigned',
  'driver-departed': 'En Route',
  'in-progress': 'In Progress',
  'completed': 'Completed',
  'cancelled': 'Cancelled',
  'available': 'Available',
  'in-use': 'In Use',
  'maintenance': 'Maintenance',
  'waiting': 'Waiting',
  'picked-up': 'Picked Up',
  'dropped-off': 'Dropped Off',
  'on-duty': 'On Duty',
  'off-duty': 'Off Duty',
};

export default function StatusBadge({ status }) {
  const color = statusColors[status] || 'gray';
  const label = statusLabels[status] || status;

  return (
    <span className={`badge badge-${color}`}>
      <span className="badge-dot" />
      {label}
    </span>
  );
}
