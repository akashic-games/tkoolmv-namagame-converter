import * as fs from "fs";
import * as path from "path";
import * as acorn from "acorn";
import type { TkoolmvPlugin } from "./TkoolmvPlugin";

export function convertPlugins(targetPlugins: TkoolmvPlugin[], srcDir: string, distDir: string): void {
	const errorPlugins: string[] = [];
	for (const p of targetPlugins) {
		// キット側で定義済みのプラグインについては変換処理を行わずスキップ
		if (fs.existsSync(path.join(distDir, `${p.name}.js`))) {
			continue;
		}
		try {
			const pluginSrc = fs.readFileSync(path.join(srcDir, `${p.name}.js`)).toString();
			const modifiedSrc = modifyPluginsJs(pluginSrc);
			fs.writeFileSync(path.join(distDir, `${p.name}.js`), modifiedSrc);
		} catch (e) {
			console.error(e);
			errorPlugins.push(p.name);
		}
	}
	if (errorPlugins.length > 0) {
		throw new Error(`Failed to convert following scripts: ${errorPlugins.join(", ")}`);
	}
}

const PLUGIN_SRC_HEADER = `Object.defineProperty(exports, "__esModule", { value: true });
var tkool_1 = require("../");

var DataManager = tkool_1.DataManager
var Bitmap = tkool_1.Bitmap;
var CacheEntry = tkool_1.CacheEntry;
var Graphics = tkool_1.Graphics;
var ImageCache = tkool_1.ImageCache;
var Input = tkool_1.Input;
var JsonEx = tkool_1.JsonEx;
var Rectangle = tkool_1.Rectangle;
var RequestQueue = tkool_1.RequestQueue;
var ScreenSprite = tkool_1.ScreenSprite;
var Sprite = tkool_1.Sprite;
var Stage = tkool_1.Stage;
var Tilemap = tkool_1.Tilemap;
var TilingSprite = tkool_1.TilingSprite;
var ToneFilter = tkool_1.ToneFilter;
var ToneSprite = tkool_1.ToneSprite;
var TouchInput = tkool_1.TouchInput;
var Utils = tkool_1.Utils;
var Weather = tkool_1.Weather;
var Window = tkool_1.Window;
var WindowLayer = tkool_1.WindowLayer;
var ImageManager = tkool_1.ImageManager;
var PluginManager = tkool_1.PluginManager;
var SceneManager = tkool_1.SceneManager;
var SoundManager = tkool_1.SoundManager;
var StorageManager = tkool_1.StorageManager;
var TextManager = tkool_1.TextManager;
var AudioManager = tkool_1.AudioManager;
var BattleManager = tkool_1.BattleManager;
var ConfigManager = tkool_1.ConfigManager;
var Game_Action = tkool_1.Game_Action;
var Game_ActionResult = tkool_1.Game_ActionResult;
var Game_Actor = tkool_1.Game_Actor;
var Game_Actors = tkool_1.Game_Actors;
var Game_Battler = tkool_1.Game_Battler;
var Game_BattlerBase = tkool_1.Game_BattlerBase;
var Game_Character = tkool_1.Game_Character;
var Game_CharacterBase = tkool_1.Game_CharacterBase;
var Game_CommonEvent = tkool_1.Game_CommonEvent;
var Game_Enemy = tkool_1.Game_Enemy;
var Game_Event = tkool_1.Game_Event;
var Game_Follower = tkool_1.Game_Follower;
var Game_Followers = tkool_1.Game_Followers;
var Game_Interpreter = tkool_1.Game_Interpreter;
var Game_Item = tkool_1.Game_Item;
var Game_Map = tkool_1.Game_Map;
var Game_Message = tkool_1.Game_Message;
var Game_Party = tkool_1.Game_Party;
var Game_Picture = tkool_1.Game_Picture;
var Game_Player = tkool_1.Game_Player;
var Game_Screen = tkool_1.Game_Screen;
var Game_SelfSwitches = tkool_1.Game_SelfSwitches;
var Game_Switches = tkool_1.Game_Switches;
var Game_System = tkool_1.Game_System;
var Game_Temp = tkool_1.Game_Temp;
var Game_Timer = tkool_1.Game_Timer;
var Game_Troop = tkool_1.Game_Troop;
var Game_Unit = tkool_1.Game_Unit;
var Game_Variables = tkool_1.Game_Variables;
var Game_Vehicle = tkool_1.Game_Vehicle;
var Scene_Base = tkool_1.Scene_Base;
var Scene_Battle = tkool_1.Scene_Battle;
var Scene_Boot = tkool_1.Scene_Boot;
var Scene_Equip = tkool_1.Scene_Equip;
var Scene_GameEnd = tkool_1.Scene_GameEnd;
var Scene_Gameover = tkool_1.Scene_Gameover;
var Scene_Item = tkool_1.Scene_Item;
var Scene_ItemBase = tkool_1.Scene_ItemBase;
var Scene_Map = tkool_1.Scene_Map;
var Scene_Menu = tkool_1.Scene_Menu;
var Scene_MenuBase = tkool_1.Scene_MenuBase;
var Scene_Options = tkool_1.Scene_Options;
var Scene_Shop = tkool_1.Scene_Shop;
var Scene_Skill = tkool_1.Scene_Skill;
var Scene_Status = tkool_1.Scene_Status;
var Scene_Title = tkool_1.Scene_Title;
var Scene_File = tkool_1.Scene_File;
var Scene_Load = tkool_1.Scene_Load;
var Scene_Save = tkool_1.Scene_Save;
var Sprite_Actor = tkool_1.Sprite_Actor;
var Sprite_Animation = tkool_1.Sprite_Animation;
var Sprite_Balloon = tkool_1.Sprite_Balloon;
var Sprite_Base = tkool_1.Sprite_Base;
var Sprite_Battler = tkool_1.Sprite_Battler;
var Sprite_Character = tkool_1.Sprite_Character;
var Sprite_Damage = tkool_1.Sprite_Damage;
var Sprite_Destination = tkool_1.Sprite_Destination;
var Sprite_Enemy = tkool_1.Sprite_Enemy;
var Sprite_Picture = tkool_1.Sprite_Picture;
var Sprite_StateIcon = tkool_1.Sprite_StateIcon;
var Sprite_StateOverlay = tkool_1.Sprite_StateOverlay;
var Sprite_Timer = tkool_1.Sprite_Timer;
var Sprite_Weapon = tkool_1.Sprite_Weapon;
var Spriteset_Base = tkool_1.Spriteset_Base;
var Spriteset_Battle = tkool_1.Spriteset_Battle;
var Spriteset_Map = tkool_1.Spriteset_Map;
var Window_ActorCommand = tkool_1.Window_ActorCommand;
var Window_Base = tkool_1.Window_Base;
var Window_BattleActor = tkool_1.Window_BattleActor;
var Window_BattleEnemy = tkool_1.Window_BattleEnemy;
var Window_BattleItem = tkool_1.Window_BattleItem;
var Window_BattleLog = tkool_1.Window_BattleLog;
var Window_BattleSkill = tkool_1.Window_BattleSkill;
var Window_ChoiceList = tkool_1.Window_ChoiceList;
var Window_Command = tkool_1.Window_Command;
var Window_EquipCommand = tkool_1.Window_EquipCommand;
var Window_EquipItem = tkool_1.Window_EquipItem;
var Window_EquipSlot = tkool_1.Window_EquipSlot;
var Window_EquipStatus = tkool_1.Window_EquipStatus;
var Window_EventItem = tkool_1.Window_EventItem;
var Window_GameEnd = tkool_1.Window_GameEnd;
var Window_Gold = tkool_1.Window_Gold;
var Window_Help = tkool_1.Window_Help;
var Window_HorzCommand = tkool_1.Window_HorzCommand;
var Window_ItemCategory = tkool_1.Window_ItemCategory;
var Window_ItemList = tkool_1.Window_ItemList;
var Window_MapName = tkool_1.Window_MapName;
var Window_MenuActor = tkool_1.Window_MenuActor;
var Window_MenuCommand = tkool_1.Window_MenuCommand;
var Window_MenuStatus = tkool_1.Window_MenuStatus;
var Window_Message = tkool_1.Window_Message;
var Window_NumberInput = tkool_1.Window_NumberInput;
var Window_Options = tkool_1.Window_Options;
var Window_PartyCommand = tkool_1.Window_PartyCommand;
var Window_ScrollText = tkool_1.Window_ScrollText;
var Window_Selectable = tkool_1.Window_Selectable;
var Window_ShopBuy = tkool_1.Window_ShopBuy;
var Window_ShopCommand = tkool_1.Window_ShopCommand;
var Window_ShopNumber = tkool_1.Window_ShopNumber;
var Window_ShopSell = tkool_1.Window_ShopSell;
var Window_ShopStatus = tkool_1.Window_ShopStatus;
var Window_SkillList = tkool_1.Window_SkillList;
var Window_SkillStatus = tkool_1.Window_SkillStatus;
var Window_SkillType = tkool_1.Window_SkillType;
var Window_Status = tkool_1.Window_Status;
var Window_TitleCommand = tkool_1.Window_TitleCommand;
var Window_SavefileList = tkool_1.Window_SavefileList;

var $gameVariables;
var $gameSystem;
var $gameSwitches;
var $gameMessage;
var $gamePlayer;
var $dataCommonEvents;
var $dataTilesets;
var $gameMap;
var $gameTemp;
var $dataEnemies;
var $gameActors;
var $dataAnimations;
var $gameParty;
var $gameTroop;
var $gameTimer;
var $gameSelfSwitches;
var $dataClasses;
var $dataWeapons;
var $dataArmors;
var $dataItems;
var $gameScreen;
var $dataTroops;
var $dataActors;
var $dataSkills;
var $dataStates;
var $dataSystem;
var $dataMapInfos;
var $dataMap;

function setGlobalVariables() {
	$gameVariables = tkool_1.$gameVariables;
	$gameSystem = tkool_1.$gameSystem;
	$gameSwitches = tkool_1.$gameSwitches;
	$gameMessage = tkool_1.$gameMessage;
	$gamePlayer = tkool_1.$gamePlayer;
	$dataCommonEvents = tkool_1.$dataCommonEvents;
	$dataTilesets = tkool_1.$dataTilesets;
	$gameMap = tkool_1.$gameMap;
	$gameTemp = tkool_1.$gameTemp;
	$dataEnemies = tkool_1.$dataEnemies;
	$gameActors = tkool_1.$gameActors;
	$dataAnimations = tkool_1.$dataAnimations;
	$gameParty = tkool_1.$gameParty;
	$gameTroop = tkool_1.$gameTroop;
	$gameTimer = tkool_1.$gameTimer;
	$gameSelfSwitches = tkool_1.$gameSelfSwitches;
	$dataClasses = tkool_1.$dataClasses;
	$dataWeapons = tkool_1.$dataWeapons;
	$dataArmors = tkool_1.$dataArmors;
	$dataItems = tkool_1.$dataItems;
	$gameScreen = tkool_1.$gameScreen;
	$dataTroops = tkool_1.$dataTroops;
	$dataActors = tkool_1.$dataActors;
	$dataSkills = tkool_1.$dataSkills;
	$dataStates = tkool_1.$dataStates;
	$dataSystem = tkool_1.$dataSystem;
	$dataMapInfos = tkool_1.$dataMapInfos;
	$dataMap = tkool_1.$dataMap;
}

// グローバル変数の初期化を可能にする
if (!DataManager._onReset.contains(setGlobalVariables)) {
	DataManager._onReset.add(setGlobalVariables);
}

// ブラウザ上の他スクリプトとの衝突を避けるため、ブラウザ以外の環境もしくはiframe内部でのみ書き換えを行う
if (typeof window === "undefined" || window.top !== window) {
	const exts = require("../../createStandardBuiltinObjectExtensions").createStandardBuiltinObjectExtensions();
	// 標準組み込みオブジェクトの書き換えを1度で済ませるために、追加予定の関数が定義済みでないことを確認
	if (!Number.prototype.clamp || !Number.prototype.mod || !Number.prototype.padZero) {
		Object.defineProperties(Number.prototype, exts.numberExtensions);
	}
	if (!String.prototype.format || !String.prototype.padZero || !String.prototype.contains) {
		Object.defineProperties(String.prototype, exts.stringExtensions);
	}
	if (!Array.prototype.equals || !Array.prototype.clone || !Array.prototype.contains) {
		Object.defineProperties(Array.prototype, exts.arrayExtensions);
	}
	if (!Math.randomInt) {
		Object.defineProperties(Math, exts.mathExtensions);
	}
}
`;

function modifyPluginsJs(src: string): string {
	acorn.parse(src, { ecmaVersion: 6 }); // 構文チェックのために AST にパースする
	return `${PLUGIN_SRC_HEADER}\n${src}`;
}
