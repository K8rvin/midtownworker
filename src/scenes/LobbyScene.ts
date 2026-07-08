import Phaser from 'phaser';
import { GAME_WIDTH } from '../config';
import { LeaderboardManager } from '../systems/LeaderboardManager';
import { NetworkManager } from '../systems/NetworkManager';
import { NetworkSettings } from '../systems/NetworkSettings';
import type { ServerMessage } from '../systems/NetworkTypes';
import {
  createMenuBackdrop,
  createMenuButton,
  createMenuPanel,
} from '../ui/MenuTheme';

export class LobbyScene extends Phaser.Scene {
  private statusText!: Phaser.GameObjects.Text;
  private playersText!: Phaser.GameObjects.Text;
  private network: NetworkManager | null = null;
  private startBtn: Phaser.GameObjects.Container | null = null;
  private onNetMessage = (msg: ServerMessage) => this.handleNetMessage(msg);

  constructor() {
    super({ key: 'LobbyScene' });
  }

  create(): void {
    const settings = NetworkSettings.load();

    createMenuBackdrop(this);
    createMenuPanel(this, GAME_WIDTH / 2, 380, 520, 480);

    this.add
      .text(GAME_WIDTH / 2, 100, 'ОНЛАЙН ЛОББИ', {
        fontFamily: 'monospace',
        fontSize: '36px',
        color: '#00b4ff',
        stroke: '#0a0a12',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(2);

    this.statusText = this.add
      .text(GAME_WIDTH / 2, 160, 'Подключение...', {
        fontFamily: 'monospace',
        fontSize: '14px',
        color: '#c8f542',
      })
      .setOrigin(0.5)
      .setDepth(2);

    this.playersText = this.add
      .text(GAME_WIDTH / 2, 220, '', {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#9ca3af',
        align: 'center',
        lineSpacing: 6,
      })
      .setOrigin(0.5)
      .setDepth(2);

    createMenuButton(this, GAME_WIDTH / 2, 320, `СЕРВЕР: ${this.shortUrl(settings.serverUrl)}`, () =>
      this.editServer()
    ).setDepth(2);

    createMenuButton(this, GAME_WIDTH / 2, 380, `КОМНАТА: ${settings.lastRoom || '—'}`, () =>
      this.editRoom()
    ).setDepth(2);

    createMenuButton(this, GAME_WIDTH / 2, 440, 'СОЗДАТЬ КОМНАТУ', () => this.createRoom()).setDepth(2);
    createMenuButton(this, GAME_WIDTH / 2, 500, 'ВОЙТИ В КОМНАТУ', () => this.joinRoom()).setDepth(2);

    this.startBtn = createMenuButton(this, GAME_WIDTH / 2, 580, 'НАЧАТЬ ИГРУ', () =>
      this.startGame()
    ).setDepth(2);
    this.startBtn.setVisible(false);

    createMenuButton(this, GAME_WIDTH / 2, 650, 'НАЗАД', () => this.goBack()).setDepth(2);

    if (settings.lastRoom) this.connectToRoom(settings.lastRoom);
  }

  private shortUrl(url: string): string {
    return url.replace('ws://', '').replace('wss://', '').slice(0, 28);
  }

  private editServer(): void {
    const s = NetworkSettings.load();
    const next = window.prompt('WebSocket URL:', s.serverUrl);
    if (next) {
      NetworkSettings.save({ ...s, serverUrl: next.trim() });
      this.scene.restart();
    }
  }

  private editRoom(): void {
    const s = NetworkSettings.load();
    const next = window.prompt('Код комнаты:', s.lastRoom || 'CITY01');
    if (next) {
      NetworkSettings.save({ ...s, lastRoom: next.trim().toUpperCase() });
      this.scene.restart();
    }
  }

  private createRoom(): void {
    const code = `R${Math.floor(Math.random() * 9000 + 1000)}`;
    const s = NetworkSettings.load();
    NetworkSettings.save({ ...s, lastRoom: code });
    this.connectToRoom(code);
  }

  private joinRoom(): void {
    const s = NetworkSettings.load();
    const code = window.prompt('Код комнаты:', s.lastRoom || '');
    if (!code) return;
    NetworkSettings.save({ ...s, lastRoom: code.trim().toUpperCase() });
    this.connectToRoom(code.trim().toUpperCase());
  }

  private async connectToRoom(room: string): Promise<void> {
    this.statusText.setText('Подключение...');
    this.network?.disconnect();

    const settings = NetworkSettings.load();
    const name = LeaderboardManager.getPlayerName();

    try {
      this.network = await NetworkManager.connect(settings.serverUrl, room, name);
      this.network.onMessage(this.onNetMessage);
      this.statusText.setText(`Комната ${room} · ${this.network.session?.isHost ? 'Вы хост' : 'Гость'}`);
      this.refreshPlayers();
      if (this.network.session?.isHost) this.startBtn?.setVisible(true);
    } catch (err) {
      this.statusText.setText(err instanceof Error ? err.message : 'Ошибка');
      this.statusText.setColor('#ff2d55');
    }
  }

  private handleNetMessage(msg: ServerMessage): void {
    if (msg.type === 'player_joined' || msg.type === 'player_left') {
      this.refreshPlayers();
    }
    if (msg.type === 'start_game') {
      this.enterGame();
    }
  }

  private refreshPlayers(): void {
    const players = this.network?.getPlayers() ?? [];
    if (players.length === 0) {
      this.playersText.setText('Ожидание игроков...');
      return;
    }
    this.playersText.setText(
      players.map((p) => `${p.isHost ? '★ ' : '· '}${p.name} (${p.id.slice(0, 4)})`).join('\n')
    );
  }

  private startGame(): void {
    if (!this.network?.session?.isHost) return;
    this.network.startGame();
    this.enterGame();
  }

  private enterGame(): void {
    this.scene.start('GameScene', { online: true, loadSave: false });
  }

  private goBack(): void {
    this.network?.disconnect();
    this.scene.start('MainMenuScene');
  }

  shutdown(): void {
    this.network?.offMessage(this.onNetMessage);
  }
}