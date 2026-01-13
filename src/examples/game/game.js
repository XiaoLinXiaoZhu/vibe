// 游戏前端逻辑 - 与后端vibe交互

class Game {
  constructor() {
    this.state = null;
    this.server = null;
  }

  // 初始化游戏
  async startGame() {
    try {
      // 调用后端初始化游戏
      const response = await fetch('/api/game/start', {
        method: 'POST'
      });
      this.state = await response.json();
      this.showScreen('menu-screen');
      this.updateMenuUI();
    } catch (error) {
      console.error('启动游戏失败:', error);
      alert('启动游戏失败，请检查服务器是否运行');
    }
  }

  // 显示指定屏幕
  showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
      screen.classList.add('hidden');
    });
    document.getElementById(screenId).classList.remove('hidden');
  }

  // 更新主菜单UI
  updateMenuUI() {
    document.getElementById('layer-info').textContent = `${this.state.currentLayer}/3`;
    document.getElementById('level-info').textContent = `${this.state.currentLevel}/4`;
    document.getElementById('generals-count').textContent = `${this.state.generals.length}/4`;

    // 显示boss预告
    const bossPreview = document.getElementById('boss-preview-content');
    if (this.state.bosses.length > 0) {
      bossPreview.textContent = this.state.bosses[this.state.currentLayer - 1] || '即将揭晓...';
    }
  }

  // 显示将领选择界面
  async showGeneralSelection() {
    try {
      const response = await fetch('/api/game/generals/available');
      const generals = await response.json();
      this.renderAvailableGenerals(generals);
      this.showScreen('general-selection-screen');
    } catch (error) {
      console.error('获取可用将领失败:', error);
      alert('获取可用将领失败');
    }
  }

  // 渲染可用将领
  renderAvailableGenerals(generals) {
    const container = document.getElementById('available-generals');
    container.innerHTML = generals.map((general, index) => `
      <div class="general-card" onclick="game.selectGeneral(${index})">
        <h3>${general.name} <span class="rarity ${general.rarity}">${this.translateRarity(general.rarity)}</span></h3>
        <p class="description">${general.description}</p>
        <div class="stats">
          <div class="stat-item">
            <label>HP</label>
            <span>${general.stats.hp}</span>
          </div>
          <div class="stat-item">
            <label>攻击</label>
            <span>${general.stats.attack}</span>
          </div>
          <div class="stat-item">
            <label>防御</label>
            <span>${general.stats.defense}</span>
          </div>
          <div class="stat-item">
            <label>速度</label>
            <span>${general.stats.speed}</span>
          </div>
        </div>
        <div class="skills">
          <h4>技能</h4>
          ${general.skills.map(skill => `
            <div class="skill-item">
              <span class="skill-name">${skill.name}</span>
              <span class="skill-type ${skill.type}">${this.translateSkillType(skill.type)}</span>
              <p class="skill-desc">${skill.description}</p>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');
  }

  // 选择将领
  async selectGeneral(index) {
    try {
      const response = await fetch('/api/game/generals/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ index })
      });
      const result = await response.json();
      
      if (result.success) {
        alert(`成功获得将领: ${result.general.name}`);
        this.state.generals = result.allGenerals;
        this.showScreen('menu-screen');
        this.updateMenuUI();
      } else {
        alert(result.message);
      }
    } catch (error) {
      console.error('选择将领失败:', error);
      alert('选择将领失败');
    }
  }

  // 查看我的将领
  async viewMyGenerals() {
    this.renderMyGenerals();
    this.showScreen('my-generals-screen');
  }

  // 渲染我的将领
  renderMyGenerals() {
    const container = document.getElementById('my-generals');
    container.innerHTML = this.state.generals.map((general, index) => `
      <div class="general-card">
        <h3>${general.name} <span class="rarity ${general.rarity}">${this.translateRarity(general.rarity)}</span></h3>
        <p class="description">${general.description}</p>
        <div class="stats">
          <div class="stat-item">
            <label>HP</label>
            <span>${general.stats.hp}</span>
          </div>
          <div class="stat-item">
            <label>攻击</label>
            <span>${general.stats.attack}</span>
          </div>
          <div class="stat-item">
            <label>防御</label>
            <span>${general.stats.defense}</span>
          </div>
          <div class="stat-item">
            <label>速度</label>
            <span>${general.stats.speed}</span>
          </div>
        </div>
        <div class="skills">
          <h4>技能</h4>
          ${general.skills.map(skill => `
            <div class="skill-item">
              <span class="skill-name">${skill.name}</span>
              <span class="skill-type ${skill.type}">${this.translateSkillType(skill.type)}</span>
              <p class="skill-desc">${skill.description}</p>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');
  }

  // 返回菜单
  showMenu() {
    this.showScreen('menu-screen');
    this.updateMenuUI();
  }

  // 开始战斗
  async startBattle() {
    try {
      const response = await fetch('/api/game/battle/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ generals: this.state.generals })
      });
      const battleState = await response.json();
      
      this.state.currentBattle = battleState;
      this.showScreen('battle-screen');
      this.renderBattlefield();
      this.updateBattleUI();
    } catch (error) {
      console.error('开始战斗失败:', error);
      alert('开始战斗失败');
    }
  }

  // 渲染战场
  renderBattlefield() {
    const battlefield = document.getElementById('battlefield');
    const { width, height } = this.state.currentBattle.battlefield;
    let html = '';

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const unit = this.findUnitAt(x, y);
        const cellClass = unit ? '' : 'grid-cell';
        const selectedClass = this.state.currentBattle.selectedUnit?.x === x && 
                             this.state.currentBattle.selectedUnit?.y === y ? 
                             'selected' : '';
        
        html += `
          <div class="${cellClass} ${selectedClass}" onclick="game.handleCellClick(${x}, ${y})">
            ${unit ? this.renderUnit(unit) : `<span style="color: #ccc">${x},${y}</span>`}
          </div>
        `;
      }
    }

    battlefield.innerHTML = html;
  }

  // 渲染单位
  renderUnit(unit) {
    const hpPercent = (unit.hp / unit.maxHp) * 100;
    return `
      <div class="unit ${unit.isPlayer ? 'player' : 'enemy'} ${!unit.isPlayer && this.state.currentBattle.isBossBattle ? 'boss' : ''}">
        <span class="unit-name">${unit.name}</span>
        <div class="unit-hp">
          <div class="hp-bar" style="width: ${hpPercent}%"></div>
        </div>
      </div>
    `;
  }

  // 查找指定位置的单位
  findUnitAt(x, y) {
    return [...this.state.currentBattle.playerUnits, ...this.state.currentBattle.enemyUnits]
      .find(unit => unit.x === x && unit.y === y);
  }

  // 更新战斗UI
  updateBattleUI() {
    const battle = this.state.currentBattle;
    
    // 更新波次
    document.getElementById('battle-wave').textContent = 
      `第${battle.currentWave}波 / 共${battle.totalWaves}波`;
    
    // 更新回合
    const turnIndicator = document.getElementById('battle-turn');
    turnIndicator.textContent = battle.currentTurn === 'player' ? '玩家回合' : '敌人回合';
    turnIndicator.className = `turn-indicator ${battle.currentTurn === 'player' ? 'player-turn' : 'enemy-turn'}`;
    
    // 更新boss信息
    const bossInfo = document.getElementById('boss-info');
    if (battle.isBossBattle && battle.boss) {
      bossInfo.classList.remove('hidden');
      bossInfo.innerHTML = `
        <span>⚔️ BOSS: ${battle.boss.name}</span>
        <br>
        <small>${battle.boss.description}</small>
      `;
    } else {
      bossInfo.classList.add('hidden');
    }
    
    // 更新选中单位信息
    this.updateSelectedUnitInfo();
    
    // 更新按钮状态
    this.updateActionButtons();
  }

  // 更新选中单位信息
  updateSelectedUnitInfo() {
    const unitInfo = document.getElementById('selected-unit-info');
    const unit = this.state.currentBattle.selectedUnit;
    
    if (unit) {
      unitInfo.innerHTML = `
        <strong>${unit.name}</strong><br>
        HP: ${unit.hp}/${unit.maxHp}<br>
        攻击: ${unit.attack}<br>
        防御: ${unit.defense}<br>
        速度: ${unit.speed}
      `;
    } else {
      unitInfo.textContent = '未选择单位';
    }
  }

  // 更新操作按钮状态
  updateActionButtons() {
    const isPlayerTurn = this.state.currentBattle.currentTurn === 'player';
    const hasSelectedUnit = this.state.currentBattle.selectedUnit !== null;
    
    document.getElementById('btn-move').disabled = !isPlayerTurn || !hasSelectedUnit;
    document.getElementById('btn-attack').disabled = !isPlayerTurn || !hasSelectedUnit;
    document.getElementById('btn-skill').disabled = !isPlayerTurn || !hasSelectedUnit;
    document.getElementById('btn-wait').disabled = !isPlayerTurn || !hasSelectedUnit;
  }

  // 处理格子点击
  handleCellClick(x, y) {
    const unit = this.findUnitAt(x, y);
    
    if (unit && unit.isPlayer) {
      // 选择己方单位
      this.state.currentBattle.selectedUnit = unit;
      this.renderBattlefield();
      this.updateBattleUI();
    } else {
      // 点击其他格子（移动或攻击）
      this.handleAction(x, y);
    }
  }

  // 处理行动
  async handleAction(x, y) {
    const selectedUnit = this.state.currentBattle.selectedUnit;
    if (!selectedUnit || this.state.currentBattle.currentTurn !== 'player') return;
    
    const targetUnit = this.findUnitAt(x, y);
    
    try {
      if (targetUnit && !targetUnit.isPlayer) {
        // 攻击敌人
        await this.executeAttack(selectedUnit, targetUnit);
      } else if (!targetUnit) {
        // 移动到空格子
        await this.executeMove(selectedUnit, x, y);
      }
    } catch (error) {
      console.error('执行行动失败:', error);
      alert('执行行动失败');
    }
  }

  // 执行移动
  async executeMove(unit, x, y) {
    try {
      const response = await fetch('/api/game/battle/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          unitId: unit.id,
          targetX: x,
          targetY: y
        })
      });
      const result = await response.json();
      
      if (result.success) {
        this.state.currentBattle = result.battleState;
        this.renderBattlefield();
        this.updateBattleUI();
        this.addBattleLog(`【移动】${unit.name} 移动到 (${x}, ${y})`);
      } else {
        alert(result.message);
      }
    } catch (error) {
      console.error('移动失败:', error);
    }
  }

  // 执行攻击
  async executeAttack(attacker, target) {
    try {
      const response = await fetch('/api/game/battle/attack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attackerId: attacker.id,
          targetId: target.id
        })
      });
      const result = await response.json();
      
      if (result.success) {
        this.state.currentBattle = result.battleState;
        this.renderBattlefield();
        this.updateBattleUI();
        this.addBattleLog(`【攻击】${attacker.name} 攻击 ${target.name}，造成 ${result.damage} 点伤害`);
        
        // 检查战斗是否结束
        this.checkBattleEnd();
      } else {
        alert(result.message);
      }
    } catch (error) {
      console.error('攻击失败:', error);
    }
  }

  // 移动动作
  actionMove() {
    const unit = this.state.currentBattle.selectedUnit;
    if (!unit) return;
    
    // 高亮可移动的格子
    document.querySelectorAll('.grid-cell').forEach(cell => {
      cell.classList.add('highlight');
    });
    this.addBattleLog('选择一个空格子进行移动');
  }

  // 攻击动作
  actionAttack() {
    const unit = this.state.currentBattle.selectedUnit;
    if (!unit) return;
    
    // 高亮可攻击的敌人
    document.querySelectorAll('.grid-cell').forEach(cell => {
      const unitElement = cell.querySelector('.unit.enemy');
      if (unitElement) {
        cell.classList.add('highlight');
      }
    });
    this.addBattleLog('选择一个敌人进行攻击');
  }

  // 技能动作
  async actionSkill() {
    const unit = this.state.currentBattle.selectedUnit;
    if (!unit) return;
    
    try {
      const response = await fetch('/api/game/battle/skill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unitId: unit.id })
      });
      const result = await response.json();
      
      if (result.success) {
        this.state.currentBattle = result.battleState;
        this.renderBattlefield();
        this.updateBattleUI();
        this.addBattleLog(`【技能】${unit.name} 使用 ${result.skillName}: ${result.description}`);
        this.checkBattleEnd();
      } else {
        alert(result.message);
      }
    } catch (error) {
      console.error('使用技能失败:', error);
    }
  }

  // 等待动作
  async actionWait() {
    const unit = this.state.currentBattle.selectedUnit;
    if (!unit) return;
    
    try {
      const response = await fetch('/api/game/battle/wait', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unitId: unit.id })
      });
      const result = await response.json();
      
      if (result.success) {
        this.state.currentBattle = result.battleState;
        this.renderBattlefield();
        this.updateBattleUI();
        this.addBattleLog(`【等待】${unit.name} 结束行动`);
        this.checkAllUnitsActed();
      }
    } catch (error) {
      console.error('等待失败:', error);
    }
  }

  // 检查战斗是否结束
  checkBattleEnd() {
    const battle = this.state.currentBattle;
    
    // 检查是否所有敌人被消灭
    if (battle.enemyUnits.length === 0) {
      if (battle.currentWave >= battle.totalWaves) {
        // 战斗胜利
        setTimeout(() => this.endBattle(true), 500);
      } else {
        // 下一波敌人
        setTimeout(() => this.nextWave(), 500);
      }
    }
    
    // 检查是否所有玩家单位被消灭
    if (battle.playerUnits.length === 0) {
      // 战斗失败
      setTimeout(() => this.endBattle(false), 500);
    }
  }

  // 下一波敌人
  async nextWave() {
    try {
      const response = await fetch('/api/game/battle/nextWave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ battleState: this.state.currentBattle })
      });
      const result = await response.json();
      
      if (result.success) {
        this.state.currentBattle = result.battleState;
        this.renderBattlefield();
        this.updateBattleUI();
        this.addBattleLog(`=== 第${this.state.currentBattle.currentWave}波敌人来袭！===`);
      }
    } catch (error) {
      console.error('下一波敌人失败:', error);
    }
  }

  // 检查所有单位是否都行动过
  async checkAllUnitsActed() {
    // 这里简化处理，玩家回合结束，切换到敌人回合
    await this.switchTurn('enemy');
  }

  // 切换回合
  async switchTurn(turn) {
    try {
      const response = await fetch('/api/game/battle/switchTurn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ turn })
      });
      const result = await response.json();
      
      if (result.success) {
        this.state.currentBattle = result.battleState;
        this.updateBattleUI();
        
        // 如果是敌人回合，执行敌人AI
        if (turn === 'enemy') {
          await this.executeEnemyTurn();
        }
      }
    } catch (error) {
      console.error('切换回合失败:', error);
    }
  }

  // 执行敌人回合
  async executeEnemyTurn() {
    try {
      const response = await fetch('/api/game/battle/enemyTurn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ battleState: this.state.currentBattle })
      });
      const result = await response.json();
      
      if (result.success) {
        this.state.currentBattle = result.battleState;
        this.renderBattlefield();
        this.updateBattleUI();
        
        // 添加战斗日志
        result.logs.forEach(log => this.addBattleLog(log));
        
        // 检查战斗是否结束
        this.checkBattleEnd();
        
        // 如果战斗未结束，切换回玩家回合
        if (this.state.currentBattle.playerUnits.length > 0 && 
            this.state.currentBattle.enemyUnits.length > 0) {
          await this.switchTurn('player');
        }
      }
    } catch (error) {
      console.error('敌人回合执行失败:', error);
    }
  }

  // 结束战斗
  async endBattle(victory) {
    try {
      const response = await fetch('/api/game/battle/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ victory })
      });
      const result = await response.json();
      
      document.getElementById('result-title').textContent = victory ? '战斗胜利！' : '战斗失败';
      document.getElementById('result-content').innerHTML = `
        <p>${result.message}</p>
        <p>获得奖励: ${result.rewards || '无'}</p>
      `;
      this.showScreen('result-screen');
      
      if (victory) {
        this.state.currentLevel++;
        if (this.state.currentLevel > 4) {
          this.state.currentLevel = 1;
          this.state.currentLayer++;
          if (this.state.currentLayer > 3) {
            // 通关
            this.showGameover(true);
          }
        }
      }
    } catch (error) {
      console.error('结束战斗失败:', error);
    }
  }

  // 游戏结束
  showGameover(victory) {
    document.getElementById('gameover-message').textContent = 
      victory ? '恭喜你通关了所有关卡！' : '游戏失败，再接再厉！';
    this.showScreen('gameover-screen');
  }

  // 添加战斗日志
  addBattleLog(message) {
    const logContent = document.getElementById('battle-log-content');
    const time = new Date().toLocaleTimeString();
    const logEntry = document.createElement('div');
    logEntry.className = 'log-entry';
    logEntry.textContent = `[${time}] ${message}`;
    logContent.insertBefore(logEntry, logContent.firstChild);
  }

  // 翻译稀有度
  translateRarity(rarity) {
    const map = {
      'common': '普通',
      'rare': '稀有',
      'epic': '史诗',
      'legendary': '传说'
    };
    return map[rarity] || rarity;
  }

  // 翻译技能类型
  translateSkillType(type) {
    const map = {
      'attack': '攻击',
      'defense': '防御',
      'support': '辅助',
      'special': '特殊'
    };
    return map[type] || type;
  }
}

// 初始化游戏实例
const game = new Game();
