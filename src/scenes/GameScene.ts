import Phaser from 'phaser';

export enum Player {
  None = 0,
  X = 1,
  O = 2,
}

export class GameScene extends Phaser.Scene {
  private board: Player[][] = [];
  private currentPlayer: Player = Player.X;
  private gameOver: boolean = false;
  private statusText!: Phaser.GameObjects.Text;

  private cellSize: number = 120;
  private gridSize: number = 3;
  private centerX: number = 0;
  private centerY: number = 0;
  private zoom: number = 0.5;
  private gridGraphics!: Phaser.GameObjects.Graphics;
  private symbols: Phaser.GameObjects.Graphics[] = [];
  private restartButton!: Phaser.GameObjects.Text;
  private victoryText!: Phaser.GameObjects.Text;
  
  // Система наград
  private starDust: number = 0;
  private rareCrystals: number = 0;
  private rewardsText!: Phaser.GameObjects.Text;
 

  constructor() {
    super('GameScene');
  }

  preload(): void {
    this.loadRewards();
  }

  create(): void {
    this.initBoard();
    this.calculateCenterPosition();
    this.drawGrid();
    this.createStatusText();
    this.createRestartButton();
    this.createVictoryText();
    this.createRewardsText();
    this.setupInput();
    this.setupResizeHandler();
  }

  private initBoard(): void {
    this.board = Array(this.gridSize)
      .fill(null)
      .map(() => Array(this.gridSize).fill(Player.None));
    this.currentPlayer = Player.X;
    this.gameOver = false;
  }

  private loadRewards(): void {
    const savedDust = sessionStorage.getItem('starDust');
    const savedCrystals = sessionStorage.getItem('rareCrystals');
    this.starDust = savedDust ? parseInt(savedDust, 10) : 0;
    this.rareCrystals = savedCrystals ? parseInt(savedCrystals, 10) : 0;
  }

  private saveRewards(): void {
    sessionStorage.setItem('starDust', this.starDust.toString());
    sessionStorage.setItem('rareCrystals', this.rareCrystals.toString());
  }

  private awardRewards(): void {
    const dustAmount = Phaser.Math.Between(10, 50);
    this.starDust += dustAmount;
    
    const gotCrystal = Phaser.Math.Between(1, 100) <= 10;
    if (gotCrystal) {
      this.rareCrystals++;
    }
    
    this.saveRewards();
    this.updateRewardsText();
    
    let rewardMessage = `+${dustAmount} Звёздной пыли`;
    if (gotCrystal) {
      rewardMessage += ` | +1 Редкий кристалл!`;
    }
    this.victoryText.setText(rewardMessage);
  }

  private calculateCenterPosition(): void {
    this.centerX = this.cameras.main.centerX;
    this.centerY = this.cameras.main.centerY;
  }

  private drawGrid(): void {
    this.gridGraphics = this.add.graphics();
    this.gridGraphics.lineStyle(3, 0xffffff, 1);

    const totalSize = this.cellSize * this.gridSize;
    const startX = this.centerX - totalSize / 2;
    const startY = this.centerY - totalSize / 2;

    // Вертикальные линии
    for (let i = 1; i < this.gridSize; i++) {
      const x = startX + i * this.cellSize;
      this.gridGraphics.moveTo(x, startY);
      this.gridGraphics.lineTo(x, startY + totalSize);
    }

    // Горизонтальные линии
    for (let i = 1; i < this.gridSize; i++) {
      const y = startY + i * this.cellSize;
      this.gridGraphics.moveTo(startX, y);
      this.gridGraphics.lineTo(startX + totalSize, y);
    }

    this.gridGraphics.strokePath();
  }

  private createStatusText(): void {
    const totalSize = this.cellSize * this.gridSize;
    this.statusText = this.add.text(this.centerX, this.centerY - totalSize / 2 - 40, 'Ход игрока: X', {
      font: 'bold 28px Arial',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 6,
    });
    this.statusText.setOrigin(this.zoom);
    this.statusText.setResolution(2);
  }

  private createRestartButton(): void {
    const totalSize = this.cellSize * this.gridSize;
    this.restartButton = this.add.text(this.centerX, this.centerY + totalSize / 2 + 80, '🔄 Рестарт', {
      font: 'bold 22px Arial',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 6,
      backgroundColor: '#4a4a6a',
      padding: { x: 20, y: 10 },
    });
    this.restartButton.setOrigin(this.zoom);
    this.restartButton.setResolution(2);
    this.restartButton.setInteractive({ useHandCursor: true });
    this.restartButton.on('pointerover', () => {
      this.restartButton.setStyle({ backgroundColor: '#6a6a8a' });
    });
    this.restartButton.on('pointerout', () => {
      this.restartButton.setStyle({ backgroundColor: '#4a4a6a' });
    });
    this.restartButton.on('pointerdown', () => {
      this.restartGame();
    });
    this.restartButton.setVisible(false);
  }

  private createVictoryText(): void {
    this.victoryText = this.add.text(this.centerX, this.centerY + this.cellSize * this.gridSize / 2 + 30, '', {
      font: 'bold 26px Arial',
      color: '#00ff00',
      stroke: '#000000',
      strokeThickness: 6,
    });
    this.victoryText.setOrigin(this.zoom);
    this.victoryText.setResolution(2);
  }

  private createRewardsText(): void {
    this.rewardsText = this.add.text(10, 10, '', {
      font: 'bold 18px Arial',
      color: '#ffff00',
      stroke: '#000000',
      strokeThickness: 6,
    });
    this.rewardsText.setResolution(2);
    this.updateRewardsText();
  }

  private updateRewardsText(): void {
    this.rewardsText.setText(`Звёздная пыль: ${this.starDust} | Редкие кристаллы: ${this.rareCrystals}`);
  }

  private setupInput(): void {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.gameOver) {
        this.restartGame();
        return;
      }

      const totalSize = this.cellSize * this.gridSize;
      const startX = this.centerX - totalSize / 2;
      const startY = this.centerY - totalSize / 2;

      const col = Math.floor((pointer.x - startX) / this.cellSize);
      const row = Math.floor((pointer.y - startY) / this.cellSize);

      if (row >= 0 && row < this.gridSize && col >= 0 && col < this.gridSize) {
        this.handleCellClick(row, col);
      }
    });
  }

  private handleCellClick(row: number, col: number): void {
    if (this.board[row][col] !== Player.None) {
      return;
    }

    this.board[row][col] = this.currentPlayer;
    this.drawSymbol(row, col, this.currentPlayer);

    if (this.checkWin()) {
      this.gameOver = true;
      // Награды получает только игрок X (человек)
      if (this.currentPlayer === Player.X) {
        this.statusText.setText('Вы победили!');
        this.awardRewards();
      } else {
        this.statusText.setText('Вы проиграли!');
        this.victoryText.setText('');
      }
      this.restartButton.setVisible(true);
    } else if (this.checkDraw()) {
      this.statusText.setText('Ничья!');
      this.victoryText.setText('');
      this.gameOver = true;
      this.restartButton.setVisible(true);
    } else {
      this.currentPlayer = this.currentPlayer === Player.X ? Player.O : Player.X;
      this.statusText.setText(`Ход игрока: ${this.currentPlayer === Player.X ? 'X' : 'O'}`);
    }
  }

  private drawSymbol(row: number, col: number, player: Player): void {
    const totalSize = this.cellSize * this.gridSize;
    const startX = this.centerX - totalSize / 2;
    const startY = this.centerY - totalSize / 2;

    const x = startX + col * this.cellSize + this.cellSize / 2;
    const y = startY + row * this.cellSize + this.cellSize / 2;

    const graphics = this.add.graphics();

    if (player === Player.X) {
      graphics.lineStyle(5, 0x00ff00, 1);
      const offset = 30;
      graphics.moveTo(x - offset, y - offset);
      graphics.lineTo(x + offset, y + offset);
      graphics.moveTo(x + offset, y - offset);
      graphics.lineTo(x - offset, y + offset);
      graphics.strokePath();
    } else {
      graphics.lineStyle(5, 0xff0000, 1);
      graphics.strokeCircle(x, y, 35);
    }

    this.symbols.push(graphics);
  }

  private checkWin(): boolean {
    // Проверка строк
    for (let row = 0; row < this.gridSize; row++) {
      if (
        this.board[row][0] !== Player.None &&
        this.board[row][0] === this.board[row][1] &&
        this.board[row][1] === this.board[row][2]
      ) {
        return true;
      }
    }

    // Проверка столбцов
    for (let col = 0; col < this.gridSize; col++) {
      if (
        this.board[0][col] !== Player.None &&
        this.board[0][col] === this.board[1][col] &&
        this.board[1][col] === this.board[2][col]
      ) {
        return true;
      }
    }

    // Проверка диагоналей
    if (
      this.board[0][0] !== Player.None &&
      this.board[0][0] === this.board[1][1] &&
      this.board[1][1] === this.board[2][2]
    ) {
      return true;
    }

    if (
      this.board[0][2] !== Player.None &&
      this.board[0][2] === this.board[1][1] &&
      this.board[1][1] === this.board[2][0]
    ) {
      return true;
    }

    return false;
  }

  private checkDraw(): boolean {
    for (let row = 0; row < this.gridSize; row++) {
      for (let col = 0; col < this.gridSize; col++) {
        if (this.board[row][col] === Player.None) {
          return false;
        }
      }
    }
    return true;
  }

  private setupResizeHandler(): void {
    this.scale.on('resize', (gameSize: Phaser.Structs.Size) => {
      this.centerX = gameSize.width / 2;
      this.centerY = gameSize.height / 2;
      this.repositionElements();
    });
  }

  private repositionElements(): void {
    // Перерисовка сетки
    this.gridGraphics.clear();
    this.drawGrid();

    // Перерисовка символов
    this.symbols.forEach((g) => g.destroy());
    this.symbols = [];

    for (let row = 0; row < this.gridSize; row++) {
      for (let col = 0; col < this.gridSize; col++) {
        if (this.board[row][col] !== Player.None) {
          this.drawSymbol(row, col, this.board[row][col]);
        }
      }
    }

    // Обновление позиции текста
    const totalSize = this.cellSize * this.gridSize;
    this.statusText.setPosition(this.centerX, this.centerY - totalSize / 2 - 40);

    // Обновление позиции текста наград
    this.rewardsText.setPosition(10, 10);

    // Обновление позиции текста победы
    this.victoryText.setPosition(this.centerX, this.centerY + totalSize / 2 + 30);

    // Обновление позиции кнопки рестарта
    this.restartButton.setPosition(this.centerX, this.centerY + totalSize / 2 + 80);
  }

  private restartGame(): void {
    this.scene.restart();
  }
}
