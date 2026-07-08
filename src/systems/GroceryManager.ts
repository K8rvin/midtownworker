import type { GameState } from '../config';
import groceriesData from '../data/groceries.json';
import furnitureData from '../data/furniture.json';

export interface GroceryItem {
  id: string;
  name: string;
  price: number;
  hunger: number;
}

export interface FurnitureItem {
  id: string;
  name: string;
  price: number;
  sleepBonus?: number;
  foodCapacity?: number;
  remoteBonus?: boolean;
  slotType: string;
}

export class GroceryManager {
  private groceries = groceriesData as GroceryItem[];
  private furniture = furnitureData as FurnitureItem[];

  constructor(private state: GameState) {}

  getFoodCount(): number {
    return Object.values(this.state.inventory.food).reduce((sum, n) => sum + n, 0);
  }

  getFoodCapacity(): number {
    let cap = 0;
    for (const fid of Object.values(this.state.furniturePlaced)) {
      const item = this.furniture.find((f) => f.id === fid);
      if (item?.foodCapacity) cap += item.foodCapacity;
    }
    return cap;
  }

  buyGrocery(itemId: string): string | null {
    const item = this.groceries.find((g) => g.id === itemId);
    if (!item) return 'Нет товара';
    if (this.state.money < item.price) return 'Недостаточно денег';
    const cap = this.getFoodCapacity();
    if (cap <= 0) return 'Нужен холодильник дома — или съешьте здесь';
    if (this.getFoodCount() >= cap) return `Холодильник полон (${cap})`;
    this.state.money -= item.price;
    this.state.inventory.food[itemId] = (this.state.inventory.food[itemId] ?? 0) + 1;
    this.state.lifeStats.foodBought += 1;
    return null;
  }

  eatNow(itemId: string): string | null {
    const item = this.groceries.find((g) => g.id === itemId);
    if (!item) return 'Нет товара';
    if (this.state.money < item.price) return 'Недостаточно денег';
    this.state.money -= item.price;
    this.state.hunger = Math.min(100, this.state.hunger + item.hunger);
    this.state.lifeStats.foodBought += 1;
    return null;
  }

  consumeFood(itemId?: string): string | null {
    if (itemId) {
      const count = this.state.inventory.food[itemId] ?? 0;
      if (count <= 0) return 'Нет такого продукта';
      const item = this.groceries.find((g) => g.id === itemId);
      if (!item) return 'Ошибка продукта';
      this.state.inventory.food[itemId] = count - 1;
      if (this.state.inventory.food[itemId] <= 0) delete this.state.inventory.food[itemId];
      this.state.hunger = Math.min(100, this.state.hunger + item.hunger);
      return null;
    }
    const sorted = [...this.groceries].sort((a, b) => b.hunger - a.hunger);
    for (const g of sorted) {
      if ((this.state.inventory.food[g.id] ?? 0) > 0) return this.consumeFood(g.id);
    }
    return 'Нет еды в запасах';
  }

  buyFurniture(itemId: string): string | null {
    const item = this.furniture.find((f) => f.id === itemId);
    if (!item) return 'Нет предмета';
    if (this.state.homeFurniture.includes(itemId)) return 'Уже куплено';
    if (this.state.money < item.price) return 'Недостаточно денег';
    this.state.money -= item.price;
    this.state.homeFurniture.push(itemId);
    return null;
  }

  getGroceries(): GroceryItem[] {
    return this.groceries;
  }

  getFurniture(): FurnitureItem[] {
    return this.furniture;
  }

  getGroceryById(id: string): GroceryItem | undefined {
    return this.groceries.find((g) => g.id === id);
  }

  getFurnitureById(id: string): FurnitureItem | undefined {
    return this.furniture.find((f) => f.id === id);
  }

  getFoodStockSummary(): string {
    const cap = this.getFoodCapacity();
    const count = this.getFoodCount();
    if (cap <= 0) return 'нет холодильника';
    const parts = this.groceries
      .filter((g) => (this.state.inventory.food[g.id] ?? 0) > 0)
      .map((g) => `${g.name}×${this.state.inventory.food[g.id]}`);
    const list = parts.length ? parts.join(', ') : 'пусто';
    return `${count}/${cap} · ${list}`;
  }

  ownsFurniture(itemId: string): boolean {
    return this.state.homeFurniture.includes(itemId);
  }

  getFurnitureBonusText(item: FurnitureItem): string {
    const parts: string[] = [];
    if (item.sleepBonus) parts.push(`сон +${item.sleepBonus}`);
    if (item.foodCapacity) parts.push(`холодильник ${item.foodCapacity}`);
    if (item.remoteBonus) parts.push('удалёнка');
    return parts.join(' · ') || item.slotType;
  }
}