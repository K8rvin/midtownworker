import type { GameState } from '../config';
import { DEFAULT_BANK } from '../config';

const DEPOSIT_MIN = 20;
const DEPOSIT_RATE_PER_DAY = 0.005; // 0.5%
const LOAN_PERIOD = 7;
const LOAN_INTEREST = 0.08; // 8% total on principal for schedule

export class BankManager {
  constructor(private state: GameState) {
    if (!this.state.bank) this.state.bank = { ...DEFAULT_BANK };
  }

  ensure(): void {
    if (!this.state.bank) this.state.bank = { ...DEFAULT_BANK };
  }

  maxLoan(): number {
    this.ensure();
    // modest life-sim credit limit
    return Math.min(900, 350 + this.state.day * 25 + Math.floor(this.state.money * 0.5));
  }

  deposit(amount: number): string | null {
    this.ensure();
    const a = Math.floor(amount);
    if (a < DEPOSIT_MIN) return `Минимальный вклад $${DEPOSIT_MIN}`;
    if (this.state.money < a) return 'Недостаточно наличных';
    this.state.money -= a;
    this.state.bank.deposit += a;
    return null;
  }

  withdraw(amount: number): string | null {
    this.ensure();
    const a = Math.floor(amount);
    if (a <= 0) return 'Укажите сумму';
    if (this.state.bank.deposit < a) return 'Недостаточно на вкладе';
    this.state.bank.deposit -= a;
    this.state.money += a;
    return null;
  }

  takeLoan(amount: number): string | null {
    this.ensure();
    const a = Math.floor(amount);
    if (this.state.bank.loanRemaining > 0) return 'Сначала погасите текущий кредит';
    if (a < 50) return 'Минимальный кредит $50';
    const max = this.maxLoan();
    if (a > max) return `Лимит кредита $${max}`;
    const total = Math.round(a * (1 + LOAN_INTEREST));
    const payment = Math.max(15, Math.ceil(total / LOAN_PERIOD));
    this.state.money += a;
    this.state.bank.loanRemaining = total;
    this.state.bank.loanPayment = payment;
    this.state.bank.loanDueDay = this.state.day + LOAN_PERIOD;
    return null;
  }

  repayLoan(amount?: number): string | null {
    this.ensure();
    if (this.state.bank.loanRemaining <= 0) return 'Нет долга';
    const a = Math.floor(amount ?? this.state.bank.loanRemaining);
    if (a <= 0) return 'Укажите сумму';
    if (this.state.money < a) return 'Недостаточно наличных';
    const pay = Math.min(a, this.state.bank.loanRemaining);
    this.state.money -= pay;
    this.state.bank.loanRemaining -= pay;
    if (this.state.bank.loanRemaining <= 0) {
      this.state.bank.loanRemaining = 0;
      this.state.bank.loanPayment = 0;
      this.state.bank.loanDueDay = 0;
    }
    return null;
  }

  /** Daily interest on deposit + weekly loan payment when due. */
  onDayAdvanced(): string | null {
    this.ensure();
    const msgs: string[] = [];

    if (this.state.bank.deposit > 0) {
      const interest = Math.max(1, Math.floor(this.state.bank.deposit * DEPOSIT_RATE_PER_DAY));
      this.state.bank.deposit += interest;
      msgs.push(`Вклад: +$${interest} %`);
    }

    if (this.state.bank.loanRemaining > 0 && this.state.day >= this.state.bank.loanDueDay) {
      const due = Math.min(this.state.bank.loanPayment, this.state.bank.loanRemaining);
      if (this.state.money >= due) {
        this.state.money -= due;
        this.state.bank.loanRemaining -= due;
        this.state.bank.loanDueDay = this.state.day + LOAN_PERIOD;
        if (this.state.bank.loanRemaining <= 0) {
          this.state.bank.loanRemaining = 0;
          this.state.bank.loanPayment = 0;
          this.state.bank.loanDueDay = 0;
          msgs.push(`Кредит погашен (платёж $${due})`);
        } else {
          msgs.push(`Платёж по кредиту $${due}`);
        }
      } else {
        // Late fee, roll due
        const fee = Math.max(10, Math.floor(due * 0.1));
        this.state.bank.loanRemaining += fee;
        this.state.bank.loanDueDay = this.state.day + LOAN_PERIOD;
        msgs.push(`Просрочка кредита: +$${fee} к долгу (нужно было $${due})`);
      }
    }

    return msgs.length ? msgs.join(' · ') : null;
  }

  statusLine(): string {
    this.ensure();
    const b = this.state.bank;
    const parts: string[] = [];
    if (b.deposit > 0) parts.push(`вклад $${b.deposit}`);
    if (b.loanRemaining > 0) parts.push(`долг $${b.loanRemaining}`);
    return parts.length ? parts.join(' · ') : 'нет операций';
  }
}
