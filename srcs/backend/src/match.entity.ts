import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('match') // Debe ser igual al nombre en el SQL de tu compañero
export class Match {
  @PrimaryGeneratedColumn({ name: 'm_pk' })
  id: number;

  @Column({ type: 'timestamp', name: 'm_date', default: () => 'CURRENT_TIMESTAMP' })
  date: Date = new Date();

  @Column({ type: 'varchar', name: 'm_mode', length: 20, nullable: true })
  mode: string;

  // m_winner_fk y m_duration los mapearemos cuando tengamos la lógica de fin de partida
}