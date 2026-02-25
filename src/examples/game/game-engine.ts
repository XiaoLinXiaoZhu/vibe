import type { General, Enemy, Skill, StageInfo } from "./vibe-api.js";
import {
  generateGeneral, generateEnemies, generateStageInfo,
  calculateDamage, decideEnemyAction, generateBattleSummary,
} from "./vibe-api.js";

export const MAP_W = 8, MAP_H = 6, MAX_GEN = 3;

export interface Unit {
  id: string; name: string; emoji: string;
  hp: number; maxHp: number; atk: number; def: number; spd: number;
  moveRange: number; skills: Skill[];
  x: number; y: number; isEnemy: boolean; isBoss: boolean;
  hasMoved: boolean; hasActed: boolean;
  kills: number; cooldowns: number[]; generalData?: General;
}
export interface Cell { x: number; y: number; terrain: "normal"|"obstacle"; }
export type Phase = "recruit"|"player_turn"|"enemy_turn"|"game_over"|"victory";
export interface GameState {
  phase: Phase; layer: number; stage: number; turn: number;
  map: Cell[][]; playerUnits: Unit[]; enemyUnits: Unit[];
  generals: General[]; stageInfo: StageInfo|null;
  selectedUnitId: string|null; log: string[];
  moveHL: {x:number;y:number}[]; atkHL: {x:number;y:number}[];
}

export class GameEngine {
  private s: GameState;
  private uid = 0;
  constructor() { this.s = this.initState(); }
  private initState(): GameState {
    return { phase:"recruit",layer:1,stage:1,turn:1,map:this.mkMap(),
      playerUnits:[],enemyUnits:[],generals:[],stageInfo:null,
      selectedUnitId:null,log:["⚔️ 欢迎来到将领战棋！"],moveHL:[],atkHL:[] };
  }
  private mkMap(): Cell[][] {
    return Array.from({length:MAP_H},(_,y)=>
      Array.from({length:MAP_W},(_,x)=>({x,y,terrain:"normal" as const})));
  }
  private nid(){ return `u${++this.uid}`; }
  getState(): GameState { return JSON.parse(JSON.stringify(this.s)); }

  private blocked(x:number,y:number,skip?:string){
    if(x<0||x>=MAP_W||y<0||y>=MAP_H)return true;
    if(this.s.map[y][x].terrain==="obstacle")return true;
    return[...this.s.playerUnits,...this.s.enemyUnits].some(u=>u.x===x&&u.y===y&&u.id!==skip&&u.hp>0);
  }
  private movable(u:Unit):{x:number;y:number}[]{
    const r:{x:number;y:number}[]=[],vis=new Set([`${u.x},${u.y}`]),q=[{x:u.x,y:u.y,s:0}];
    while(q.length){const c=q.shift()!;if(c.s>0)r.push({x:c.x,y:c.y});if(c.s>=u.moveRange)continue;
    for(const[dx,dy]of[[0,1],[0,-1],[1,0],[-1,0]]){const nx=c.x+dx,ny=c.y+dy,k=`${nx},${ny}`;
    if(!vis.has(k)&&!this.blocked(nx,ny,u.id)){vis.add(k);q.push({x:nx,y:ny,s:c.s+1})}}}return r;
  }
  private atkRange(u:Unit):{x:number;y:number}[]{
    const mr=Math.max(1,...u.skills.map(s=>s.range)),r:{x:number;y:number}[]=[];
    for(let dy=-mr;dy<=mr;dy++)for(let dx=-mr;dx<=mr;dx++){
    if(!dx&&!dy)continue;if(Math.abs(dx)+Math.abs(dy)>mr)continue;
    const nx=u.x+dx,ny=u.y+dy;
    if(nx>=0&&nx<MAP_W&&ny>=0&&ny<MAP_H)r.push({x:nx,y:ny});}return r;
  }
  private clearHL(){this.s.selectedUnitId=null;this.s.moveHL=[];this.s.atkHL=[];}
  private resetFlags(units:Unit[]){
    for(const u of units){u.hasMoved=false;u.hasActed=false;
    for(let i=0;i<u.cooldowns.length;i++)if(u.cooldowns[i]>0)u.cooldowns[i]--;}
  }
  async recruitGeneral(theme:string,role:string):Promise<GameState>{
    if(this.s.phase!=="recruit")throw new Error("非招募阶段");
    if(this.s.generals.length>=MAX_GEN)throw new Error("将领已满");
    this.s.log.push(`🔮 召唤${theme}·${role}将领中...`);
    const g=await generateGeneral(theme,role);
    this.s.generals.push(g);
    this.s.log.push(`✨ ${g.emoji} ${g.name}「${g.title}」加入！${g.description}`);
    return this.getState();
  }
  async finishRecruit():Promise<GameState>{
    if(!this.s.generals.length)throw new Error("至少招募1个将领");
    return this.beginStage();
  }
  private async beginStage():Promise<GameState>{
    const{layer,stage}=this.s;
    this.s.log.push(`\n📜 第${layer}层·第${stage}关`);
    const info=await generateStageInfo(layer,stage);
    this.s.stageInfo=info;
    this.s.log.push(`${info.emoji}【${info.name}】${info.description}`);
    if(info.specialRule!=="none")this.s.log.push(`⚠️ ${info.specialRule}`);
    this.s.map=this.mkMap();
    for(let i=0,n=3+Math.floor(Math.random()*4);i<n;i++){
      const ox=2+Math.floor(Math.random()*(MAP_W-4));
      const oy=1+Math.floor(Math.random()*(MAP_H-2));
      this.s.map[oy][ox].terrain="obstacle";
    }
    this.s.log.push(`👹 生成敌人...`);
    const enemies=await generateEnemies(layer,stage,info.terrain);
    this.s.enemyUnits=enemies.map((e,i)=>({
      id:this.nid(),name:e.name,emoji:e.emoji,
      hp:e.hp,maxHp:e.hp,atk:e.atk,def:e.def,spd:e.spd,
      moveRange:e.moveRange,skills:e.skills,
      x:MAP_W-1,y:Math.min(1+i*2,MAP_H-1),
      isEnemy:true,isBoss:e.isBoss,
      hasMoved:false,hasActed:false,kills:0,
      cooldowns:e.skills.map(()=>0),
    }));
    this.s.log.push(`⚔️ ${this.s.enemyUnits.map(e=>`${e.emoji}${e.name}`).join(", ")}`);
    this.s.playerUnits=this.s.generals.map((g,i)=>({
      id:this.nid(),name:g.name,emoji:g.emoji,
      hp:g.hp,maxHp:g.hp,atk:g.atk,def:g.def,spd:g.spd,
      moveRange:g.moveRange,skills:g.skills,
      x:0,y:Math.min(1+i*2,MAP_H-1),
      isEnemy:false,isBoss:false,
      hasMoved:false,hasActed:false,kills:0,
      cooldowns:g.skills.map(()=>0),generalData:g,
    }));
    this.s.phase="player_turn";this.s.turn=1;
    this.s.log.push(`\n🎯 第1回合 — 玩家行动！`);
    return this.getState();
  }
  selectUnit(id:string):GameState{
    if(this.s.phase!=="player_turn")throw new Error("非玩家回合");
    const u=this.s.playerUnits.find(u=>u.id===id);
    if(!u)throw new Error("无此单位");
    this.s.selectedUnitId=id;
    this.s.moveHL=u.hasMoved?[]:this.movable(u);
    this.s.atkHL=u.hasActed?[]:this.atkRange(u);
    return this.getState();
  }
  deselectUnit():GameState{this.clearHL();return this.getState();}
  moveUnit(id:string,tx:number,ty:number):GameState{
    if(this.s.phase!=="player_turn")throw new Error("非玩家回合");
    const u=this.s.playerUnits.find(u=>u.id===id);
    if(!u)throw new Error("无此单位");
    if(u.hasMoved)throw new Error("已移动");
    if(!this.movable(u).some(p=>p.x===tx&&p.y===ty))throw new Error("不可达");
    u.x=tx;u.y=ty;u.hasMoved=true;
    this.s.log.push(`${u.emoji}${u.name} → (${tx},${ty})`);
    this.s.moveHL=[];this.s.atkHL=u.hasActed?[]:this.atkRange(u);
    return this.getState();
  }
  async attack(aId:string,dId:string):Promise<GameState>{
    if(this.s.phase!=="player_turn")throw new Error("非玩家回合");
    const a=this.s.playerUnits.find(u=>u.id===aId);
    const d=this.s.enemyUnits.find(u=>u.id===dId);
    if(!a||!d)throw new Error("无此单位");
    if(a.hasActed)throw new Error("已行动");
    if(Math.abs(a.x-d.x)+Math.abs(a.y-d.y)>1)throw new Error("超出范围");
    const r=await calculateDamage(
      {name:a.name,atk:a.atk,skills:a.skills},
      {name:d.name,def:d.def,hp:d.hp},-1);
    d.hp=Math.max(0,d.hp-r.damage);a.hasActed=true;a.hasMoved=true;
    this.s.log.push(`⚔️ ${r.narrative}`);
    if(r.isCritical)this.s.log.push(`💥 暴击！`);
    if(r.effectApplied!=="none")this.s.log.push(`✨ ${r.effectApplied}`);
    if(d.hp<=0){this.s.log.push(`💀 ${d.emoji}${d.name} 被击败！`);
      this.s.enemyUnits=this.s.enemyUnits.filter(u=>u.id!==dId);a.kills++;}
    this.clearHL();
    if(!this.s.enemyUnits.length)return this.onWin();
    return this.getState();
  }
  async useSkill(uid:string,si:number,tid:string):Promise<GameState>{
    if(this.s.phase!=="player_turn")throw new Error("非玩家回合");
    const u=this.s.playerUnits.find(u=>u.id===uid);
    const t=this.s.enemyUnits.find(u=>u.id===tid);
    if(!u||!t)throw new Error("无此单位");
    if(u.hasActed)throw new Error("已行动");
    const sk=u.skills[si];if(!sk)throw new Error("无此技能");
    if(u.cooldowns[si]>0)throw new Error("冷却中");
    if(Math.abs(u.x-t.x)+Math.abs(u.y-t.y)>sk.range)throw new Error("超出范围");
    const r=await calculateDamage(
      {name:u.name,atk:u.atk,skills:u.skills},
      {name:t.name,def:t.def,hp:t.hp},si);
    t.hp=Math.max(0,t.hp-r.damage);
    u.hasActed=true;u.hasMoved=true;u.cooldowns[si]=sk.cooldown;
    this.s.log.push(`🌟 ${u.emoji}${u.name}「${sk.name}」！${r.narrative}`);
    if(r.isCritical)this.s.log.push(`💥 暴击！`);
    if(t.hp<=0){this.s.log.push(`💀 ${t.emoji}${t.name} 被击败！`);
      this.s.enemyUnits=this.s.enemyUnits.filter(e=>e.id!==tid);u.kills++;}
    this.clearHL();
    if(!this.s.enemyUnits.length)return this.onWin();
    return this.getState();
  }
  async endPlayerTurn():Promise<GameState>{
    if(this.s.phase!=="player_turn")throw new Error("非玩家回合");
    this.clearHL();this.s.phase="enemy_turn";
    this.s.log.push(`\n👹 敌方回合！`);
    this.resetFlags(this.s.enemyUnits);
    for(const e of[...this.s.enemyUnits]){
      if(e.hp<=0)continue;
      const alive=this.s.playerUnits.filter(u=>u.hp>0);
      if(!alive.length)break;
      try{
        const act=await decideEnemyAction(
          {name:e.name,atk:e.atk,hp:e.hp,maxHp:e.maxHp,
           moveRange:e.moveRange,skills:e.skills,x:e.x,y:e.y},
          alive.map(u=>({name:u.name,hp:u.hp,x:u.x,y:u.y})),
          MAP_W,MAP_H);
        this.s.log.push(`🤖 ${e.emoji}${e.name}：${act.reasoning}`);
        // 尝试移动
        const tx=Math.max(0,Math.min(MAP_W-1,act.targetX));
        const ty=Math.max(0,Math.min(MAP_H-1,act.targetY));
        if(act.type==="move"){
          if(!this.blocked(tx,ty,e.id)){e.x=tx;e.y=ty;}
        } else if(act.type==="attack"||act.type==="skill"){
          // 先靠近目标
          if(!this.blocked(tx,ty,e.id)&&(tx!==e.x||ty!==e.y)){e.x=tx;e.y=ty;}
          // 找相邻玩家攻击
          const adj=alive.find(p=>Math.abs(p.x-e.x)+Math.abs(p.y-e.y)<=1);
          if(adj){
            const si=act.skillIndex>=0&&act.skillIndex<e.skills.length?act.skillIndex:-1;
            const r=await calculateDamage(
              {name:e.name,atk:e.atk,skills:e.skills},
              {name:adj.name,def:adj.def,hp:adj.hp},si);
            adj.hp=Math.max(0,adj.hp-r.damage);
            this.s.log.push(`⚔️ ${r.narrative}`);
            if(adj.hp<=0){
              this.s.log.push(`💀 ${adj.emoji}${adj.name} 阵亡！`);
              this.s.playerUnits=this.s.playerUnits.filter(u=>u.id!==adj.id);
              e.kills++;
            }
          }
        }
      }catch{ this.s.log.push(`${e.emoji}${e.name} 犹豫不决...`); }
    }
    // 检查败北
    if(!this.s.playerUnits.filter(u=>u.hp>0).length){
      this.s.phase="game_over";
      this.s.log.push(`\n💔 全军覆没...游戏结束`);
      return this.getState();
    }
    // 下一回合
    this.s.turn++;this.s.phase="player_turn";
    this.resetFlags(this.s.playerUnits);
    this.s.log.push(`\n🎯 第${this.s.turn}回合 — 玩家行动！`);
    return this.getState();
  }
  private async onWin():Promise<GameState>{
    const sName=this.s.stageInfo?.name||"未知关卡";
    const stats=this.s.playerUnits.map(u=>({name:u.name,remainingHp:u.hp,kills:u.kills}));
    try{
      const summary=await generateBattleSummary(sName,stats,this.s.turn,true);
      this.s.log.push(`\n🏆 ${summary.title}`);
      this.s.log.push(summary.narrative);
      this.s.log.push(`⭐ MVP: ${summary.mvp} — ${summary.mvpReason}`);
      this.s.log.push(`🎁 ${summary.rewards}`);
    }catch{ this.s.log.push(`\n🏆 胜利！`); }
    // 推进关卡
    this.s.stage++;
    if(this.s.stage>4){this.s.stage=1;this.s.layer++;}
    if(this.s.layer>3){
      this.s.phase="victory";
      this.s.log.push(`\n👑 恭喜通关！你是真正的战棋大师！`);
      return this.getState();
    }
    this.s.log.push(`\n➡️ 进入第${this.s.layer}层·第${this.s.stage}关...`);
    return this.beginStage();
  }
}
