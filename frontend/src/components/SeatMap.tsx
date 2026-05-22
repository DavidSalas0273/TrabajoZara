import type { Seat } from '../types';

function SeatMap({ seats, selectedSeatId, onSelect }: { seats: Seat[]; selectedSeatId: number | null; onSelect: (seat: Seat) => void }) {
  return (
    <div className="seat-map">
      {seats.map((seat) => {
        const sold = seat.status === 'sold';
        const selected = selectedSeatId === seat.id;
        return (
          <button
            className={`seat ${sold ? 'sold' : ''} ${selected ? 'selected' : ''}`}
            disabled={sold}
            key={seat.id}
            onClick={() => onSelect(seat)}
            type="button"
          >
            {seat.seat_number}
          </button>
        );
      })}
    </div>
  );
}

export default SeatMap;
