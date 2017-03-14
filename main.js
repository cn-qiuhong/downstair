var pixelRatio = window.devicePixelRatio ? window.devicePixelRatio : 2;

var info_screen = {
	w: 1920,
	h: 1080
};
var info_screen0 = {
	w: window.innerWidth,
	h: window.innerHeight
};

//判断是否是移动端
var bro = function () {
	var browser = navigator.userAgent;
	var result = Math.max(browser.indexOf('Android'), browser.indexOf('iPhone'), browser.indexOf('iPad'), browser.indexOf('Mobile'));
	return result;
}();
if (bro > 0) {
	info_screen = {
		w: 720,
		h: 1280
	};
	info_screen0 = {
		w: window.screen.width,
		//h: window.screen.height
		h: window.innerHeight
	};
}
//显示比例
var sc_x = info_screen0.w / info_screen.w;
var sc_y = info_screen0.h / info_screen.h;
var Game_name = "downstair_hx";

//主函数，入口
var main = function () {
	var T = Tina().requires("Input,Sprites,Scenes,Text,Entities")
		.setup("canvas", {width: info_screen0.w, height: info_screen0.h, pixelRatio: pixelRatio, scale: {x: sc_x, y: sc_y}})
		.controls();
	//游戏状态；主角；全局速度；表情变换；左右键点击
	var status, player, gspeed = 0, extime = 0, leftdown, rightdown, down_g, start_x, end_x, impacted, bgmusic;

	//普通楼梯
	var NormalStair = T.Entity.extend({
		w: bro > 0 ? 154 : 260, h: 36, asset: "ordinarystair.png", center: {x: bro > 0 ? 77 : 130, y: 18},
		hp: 1, added_hp: false, id: 0, y_speed: -2, z: 98, x_speed: 0,
		init: function (ops) {
			this._super(ops);
			this.merge("frameAnim");
			this.initSheet();
		},
		update: function (dt) {
			if (gspeed > -15)  gspeed = this.y_speed = -Math.floor(player.score / 10) - 2;
			else this.y_speed = gspeed;
			//gspeed = this.y_speed = -15;
			this.y += this.y_speed;
			var result = impact(player, this);
			if (player.harm_time == -1 && result == 1) { //碰撞调用
				player.load_act = this.id;
				player.vertical_speed = this.y_speed;
				player.y = this.y - this.h / 2 - player.rh / 2 + 1;
				this.hpchange();
				this.action();
			} else if (player.harm_time == -1 && !player.stand && result == 3) {
				player.impact_r = true;
				player.x = this.x - this.w / 2 - player.rw / 2 + 1;
			} else if (player.harm_time == -1 && !player.stand && result == 4) {
				player.impact_l = true;
				player.x = this.x + this.w / 2 + player.rw / 2 - 1;
			} else if (!result) { //没有碰撞时调用
				if (player.load_act == this.id) { //执行
					player.load_act = 0;
					this.leave();
				}
			}
			impacted[this.id] = result;
			this.anim();
			if (!this.added_hp && sameHorizontal(player, this)) {
				finalstairnum++;
				this.added_hp = true;
			}
			if (this.y < 126 - this.h / 2) { //超过屏幕上边界，移除
				this.parent.remove(this);
			}
			this._super(dt);
		},
		hpchange: function () { //人物碰到楼梯顶面血量的变化
			if (!this.added_hp) {
				player.hp += this.hp;
				if (player.hp > 9)player.hp = 9;
				player.hpchange = this.hp;
				extime = 0;
				player.score++;
				finalstairnum++;
				this.added_hp = true;
				this.parent.add(new Text("+" + this.hp, {x: player.x - 20, y: player.y - 60}));
				var adhp = new AddHpEffect({x: player.x, y: player.y, w: 100, h: 100, center: {x: 50, y: 50}, time: 15});
				adhp.setAnimSheet("sheet_addhp", "addhpeffect");
				adhp.action = function () {
					this.x = player.x;
					this.y = player.y;
				};
				this.parent.add(adhp);
			}
		},
		leave: function () { //人物离开此楼梯时调用
			player.vertical_speed = 8;
		},
		initSheet: function () { //初始化sheet
		},
		action: function () { //人物碰到楼梯顶面触发楼梯的不同的反应行为,抽象函数，
		},
		anim: function () { //楼梯动画
		}
	});

	//道具
	var Prop = T.Sprite.extend({
		z: 98, w: 40, h: 40, center: {x: 20, y: 20},
		update: function () {
			this.y += gspeed;
			if (impact(player, this)) {
				this.action();
				this.parent.remove(this);
			}
		},
		action: function () {
		}
	});

	//动画播放
	var AnimPlayer = T.Entity.extend({
		speed: 0, timing: 0, timeadd: 1,
		init: function (ops) {
			this._super(ops);
			this.merge("frameAnim");
		},
		update: function (dt) {
			this._super(dt);
			this.play('anim');
			this.action();
		},
		action: function () {
		}
	});

	//特效,设置time显示时间
	var AddHpEffect = AnimPlayer.extend({
		time: 0, z: 99,
		update: function (dt) {
			this._super(dt);
			this.time--;
			if (this.time == 0)this.parent.remove(this);
		}
	});

	//金币，加分
	var Coin = Prop.extend({
		asset: 'coin.png',
		action: function () {
			player.score++;
			//T.getAsset().play();
			(new Audio('audio/coin.mp3')).play();
		}
	});

	//十字架，无敌
	var Cross = Prop.extend({
		asset: 'cross.png',
		action: function () {
			player.harming = 120;
		}
	});

	//表情
	var Expression = T.Sprite.extend({
		w: 630, h: 900, x: 1285, y: 50, asset: "player_lihui1.png", z: 10, time: 30,
		update: function () {
			if (player.hpchange > 0 && extime < this.time)        this.asset = "player_lihui3.png";
			else if (player.hpchange < 0 && extime < this.time)        this.asset = "player_lihui2.png";
			else  this.asset = "player_lihui1.png";
			extime++;
		}
	});

	//闪烁的物体
	var Flicker = T.Sprite.extend({
		timer: 150, time: 1, addoreduce: false,
		update: function (dt) {
			this._super(dt);
			this.alpha = 1 - 1 / this.timer * (this.addoreduce ? this.time++ : this.time--);
			if (this.time == 0)this.addoreduce = true;
			else if (this.time == this.timer)this.addoreduce = false;
		}
	});

	//易碎楼梯
	var FragileStair = NormalStair.extend({
		w: bro > 0 ? 130 : 220, h: 50, center: {x: bro > 0 ? 65 : 110, y: 20}, fraged: false, fraging: 45,
		initSheet: function () {
			this.setAnimSheet("sheet_fragilestair", "fragilestair");
		},
		action: function () {
			if (!this.fraged) {
				this.fraged = true;
				this.play("frag");
			}
		},
		anim: function () {
			if (this.fraged) {
				this.fraging--;
				if (this.fraging == 30) {
					switch (gspeed) {
						case -2:
							player.harm_time = 11;
							break;
						case -3:
							player.harm_time = 10;
							break;
						case -4:
						case -5:
							player.harm_time = 9;
							break;
						case -6:
							player.harm_time = 8;
							break;
						case -7:
						case -8:
							player.harm_time = 7;
							break;
						case -9:
						case -10:
						case -11:
							player.harm_time = 6;
							break;
						case -12:
						case -13:
						case -14:
						case -15:
							player.harm_time = 5;
							break;
					}
					this.leave();
				}
				if (this.fraging == 0)    this.parent.remove(this);
			}
		}
	});

	//没完成任务游戏结束背景
	var GameOver = T.Sprite.extend({
		z: 1000, asset: "bg_over.png", w: bro > 0 ? 600 : 1100, h: 240,
		center: {x: bro > 0 ? 300 : 550, y: 120}, x: bro > 0 ? 360 : 608, y: 0.5 * info_screen.h,
		init: function () {
			setStorage(player.score, finalstairnum);
			window.setTimeout(function () {
				T.stageScene('ready');
			}, 2000);
			bgmusic.pause();
			//T.getAsset('gameover.mp3').play();
			(new Audio('audio/gameover.mp3')).play();
		}
	});

	//蹦床楼梯
	var JumpStair = NormalStair.extend({
		center: {x: bro > 0 ? 59 : 100, y: 18}, actioning: 0, w: bro > 0 ? 118 : 200, h: 36, player_y_speed: -14,
		initSheet: function () {
			this.setAnimSheet("sheet_trampolinestair", "trampolinestair");
		},
		action: function () {
			this.actioning = 2;
			player.vertical_speed = this.player_y_speed;
		},
		leave: function () {
		},
		anim: function () {
			if (this.actioning > 0) {
				this.h = 18;
				this.center.y = 9;
				this.play("bounce");
				this.actioning--;
			} else {
				this.play("idle");
				this.h = 36;
				this.center.y = 18;
			}
		}
	});

	//动态加载楼梯
	var LoadStair = T.Sprite.extend({
		number: 1000,
		init: function (ops) {
			this.on("added", function () {
				this.stairarray = new Array(this.number);
				this.stairarray[1] = new NormalStair({x: bro > 0 ? 360 : 600, y: 800, id: 1});
				this.parent.add(this.stairarray[1]);
				this.stairarray[2] = new NormalStair({x: bro > 0 ? 150 : 260, y: 980, id: 2});
				this.parent.add(this.stairarray[2]);
				this.stairarray[3] = new NormalStair({x: bro > 0 ? 530 : 920, y: 1160, id: 3});
				this.parent.add(this.stairarray[3]);
				this.id = 4;
			});
		},
		update: function (dt) {
			var id = this.id;
			if (id < this.number && this.stairarray[id - 1].y < info_screen.h) {
				var i;
				if (player.score < 75)i = parseInt(Math.random() * (8 - parseInt(player.score / 25)));
				else i = parseInt(Math.random() * 5);
				var _range = bro > 0 ? 490 : 830;
				var yzhi = bro > 0 ? 1550 : 1310;
				var x = parseInt(Math.random() * _range) + (bro > 0 ? 75 : 200);
				var ops = {x: x, y: yzhi, id: id};
				switch (i) {
					case 0:
						this.stairarray[id] = new NormalStair(ops);
						break;
					case 1:
						this.stairarray[id] = new ThornStair(ops);
						break;
					case 2:
					case 5:
						var scale_x = parseInt(Math.random() * 2);
						this.stairarray[id] = new MoveStair(ops);
						if (scale_x == 0) {
							this.stairarray[id].scale.x = 1;
							this.stairarray[id].x_speed = -this.stairarray[id].x_speed;
						}
						break;
					case 3:
					case 6:
						this.stairarray[id] = new JumpStair(ops);
						break;
					case 4:
					case 7:
						this.stairarray[id] = new FragileStair(ops);
						break;
				}
				this.parent.add(this.stairarray[id]);
				var louti = this.stairarray[id];
				switch (parseInt(Math.random() * 30)) {
					case 0:
						this.parent.add(new Coin({x: x, y: yzhi - louti.h / 2 - 25}));
						break;
					case 1:
						this.parent.add(new Cross({x: x, y: yzhi - louti.h / 2 - 25}));
						break;
					case 2:
						this.parent.add(new Skull({x: x, y: yzhi - louti.h / 2 - 25}));
						break;
					case 3:
						this.parent.add(new Wine({x: x, y: yzhi - louti.h / 2 - 25}));
						break;
				}
				this.id++;
			}
		}
	});

	//移动楼梯
	var MoveStair = NormalStair.extend({
		center: {x: bro > 0 ? 77 : 130, y: 16}, h: 32, scale: {x: -1, y: 1}, x_speed: 1.5,
		initSheet: function () {
			this.setAnimSheet("sheet_conveyorstair", "conveyorstair");
		},
		anim: function () {
			this.play("move", 1, 1 / 5, {
				loop: true
			});
		},
		action: function () {
			player.horizontal_speed = this.x_speed;
		},
		leave: function () {
			player.horizontal_speed = 0;
			player.vertical_speed = 8;
		}
	});

	//玩家控制的人物
	var Player = T.Entity.extend({
		x: bro > 0 ? 360 : 600, y: 300, z: 99, speed: 50, rate: 1 / 5, w: 100, h: 100, rw: 37, rh: 69,
		center: {x: 48, y: 50}, hp: 9, down_speed: 0.7, up_speed: 0, vertical_speed: 0, horizontal_speed: 0,
		load_act: 0, hpchange: 0, harm_time: -1, x_speed: 0, y_speed: 0, score: 0, harming: 0, harmtime: 40, hurt: -3,
		toplimit: bro > 0 ? 0.125 * info_screen.h : 135, rightlimit: bro > 0 ? 0.99 * info_screen.w : 1162,
		leftlimit: bro > 0 ? info_screen.w * 0.01 : 55, movespeed: bro > 0 ? 5 : 8,
		stand: false, impact_l: false, impact_r: false,
		init: function (ops) {
			this._super(ops);
			this.merge("frameAnim");
			this.setAnimSheet('sheet_player', 'player');
		},
		update: function (dt) {
			//如果玩家HP大于零时，才能接受按键操作
			//this.hp = 9;//无敌
			if (this.hp > 0) {
				if (( T.inputs['left'] || leftdown || end_x < start_x) && !this.impact_l) {
					this.scale.x = -1;
					this.accel.x -= this.movespeed;
				}
				this.impact_l = false;
				if ((T.inputs['right'] || rightdown || end_x > start_x) && !this.impact_r) {
					this.scale.x = 1;
					this.accel.x += this.movespeed;
				}
				this.impact_r = false;
			}
			if (this.hp < 1 || this.y > info_screen.h) {//这里可以添加死亡动画
				this.hp = 0;
				this.parent.pause();
				if (this.y > info_screen.h) {
					//T.getAsset('death.mp3').play();
					(new Audio('audio/death.mp3')).play();
				}
				this.parent.add(new GameOver());
			}
			//如果没有踩到楼梯时进行的动作
			if (this.load_act == 0 && this.vertical_speed < 8)      this.vertical_speed += this.down_speed;
			//上边际判定
			if (this.y < this.toplimit + this.w / 2 && this.harm_time == -1) {
				this.y = 240 + this.w / 2;
				this.vertical_speed = 5;
				if (this.harming == 0) {
					this.hp += this.hurt;
					if (this.hp < 0)  this.hp = 0;
					this.hpchange = this.hurt;
					extime = 0;
					this.harm_time = 20;
					this.harming = this.harmtime;
					this.parent.add(new Text(this.hurt, {x: this.x - 20, y: this.y}));
					var diaoxue = new AddHpEffect({x: player.x, y: player.y, w: 100, h: 140, center: {x: 50, y: 70}, time: 20});
					diaoxue.setAnimSheet("sheet_diaoxue", "diaoxue");
					diaoxue.action = function () {
						this.x = player.x;
						this.y = player.y - 10;
					};
					this.parent.add(diaoxue);
					//T.getAsset('hurt.mp3').play();
					(new Audio('audio/hurt.mp3')).play();
				}
			}
			//将所有的x和y方向的速度进行总和
			this.x_speed = this.accel.x + this.horizontal_speed;
			this.y_speed = this.accel.y + this.vertical_speed;
			if (this.y_speed < 0)this.stand = true;
			else this.stand = false;
			//首先判定x方向是否有变化，如果没有变化
			if (this.accel.x != 0 && this.stand)     this.play("player_run");
			else if (this.y_speed != 0 && this.load_act == 0)    this.play("player_down");
			else     this.play("player_idle");
			//根据速度对玩家x和y进行改变
			if ((this.x < (this.rightlimit - this.w / 2) && this.x_speed > 0) || (this.x > (this.leftlimit + this.w / 2) && this.x_speed < 0)) {
				this.bx = this.x;
				this.x += this.x_speed;
			}
			this.by = this.y;
			this.y += this.y_speed;
			//将按键所赋的x和y方向的速度置0
			this.accel.x = 0;
			this.accel.y = 0;
			if (this.harm_time > -1)  this.harm_time--;
			if (this.harming) {
				if (this.harming % 10 > 4)this.alpha = 0;
				else this.alpha = 1;
				this.harming--;
			} else this.alpha = 1;
			this._super(dt);
		}
	});

	//分数显示
	var Score = T.Sprite.extend({
		spacing: 0, played: false,
		init: function (ops) {
			this._super(ops);
			this.on("added", function () {
				this.parent.add(this.bai = new T.Sprite({x: this.x, y: this.y, z: 101, w: this.w, h: this.h}));
				this.parent.add(this.shi = new T.Sprite({x: this.x + this.spacing, y: this.y, z: 101, w: this.w, h: this.h}));
				this.parent.add(this.ge = new T.Sprite({
					x: this.x + this.spacing * 2, y: this.y, z: 101, w: this.w, h: this.h
				}));
			});
		},
		update: function (dt) {
			this.bai.asset = parseInt(player.score / 100) + ".png";
			this.shi.asset = parseInt(player.score % 100 / 10) + ".png";
			this.ge.asset = player.score % 10 + ".png";
			if (player.score > 99 && !this.played) {
				this.played = true;
				bgmusic.pause();
				//bgmusic = T.getAsset('victory.mp3');
				bgmusic = new Audio('audio/victory.mp3');
				bgmusic.play();
			}
		}
	});

	//骷髅，扣血
	var Skull = Prop.extend({
		asset: 'skull.png',
		action: function () {
			player.hp--;
			player.hpchange = -1;
			extime = 0;
			this.parent.add(new Text(-1, {x: player.x - 20, y: player.y - 60}));
			if (player.hp < 0)player.hp = 0;
			//T.getAsset('xixue.mp3').play();
			(new Audio('audio/xixue.mp3')).play();
		}
	});

	//楼梯间,会向上移动的墙壁
	var StairCase = T.Entity.extend({
		w: 0.023 * info_screen.w, h: info_screen.h, y: 0.046 * info_screen.h, z: 10,
		init: function (ops) {
			this._super(ops);
			this.merge("frameAnim");
			this.setAnimSheet("sheet_staircase", "staircase");
			this.on("added", function () {
				this.play("moveup", 1, 1 / 3, {loop: true});
			});
		}
	});

	//渐隐文本
	var Text = T.CText.extend({
		time: 50, z: 200,
		init: function (text, ops) {
			this._super(text, ops);
			this.setSize(25);
			if (text > 0)this.color = "#0f0";
			else if (text < 0)this.color = "#f00";
		},
		update: function (dt) {
			this.y += gspeed;
			this.alpha = 1 - 1 / this.time--;
			if (this.time == 0)this.parent.remove(this);
		}
	});

	//滚动文本
	var Text_Scroll = T.CText.extend({
		z: 10,
		init: function (text, ops) {
			this._super(text, ops);
			this.setSize(20);
		}
	});

	//尖刺楼梯/
	var ThornStair = NormalStair.extend({
		hp: -3, asset: "thornstair.png",
		hpchange: function () {
			if (!this.added_hp) {
				player.score++;
				if (player.harming == 0) {
					player.hp += this.hp;
					if (player.hp < 0)player.hp = 0;
					player.hpchange = this.hp;
					extime = 0;
					this.added_hp = true;
					player.harming = player.harmtime;
					this.parent.add(new Text(this.hp, {x: player.x - 20, y: player.y - 60}));
					var diaoxue = new AddHpEffect({x: player.x, y: player.y, w: 100, h: 140, center: {x: 50, y: 70}, time: 35});
					diaoxue.setAnimSheet("sheet_diaoxue", "diaoxue");
					diaoxue.action = function () {
						this.x = player.x;
						this.y = player.y - 10;
					};
					this.parent.add(diaoxue);
					//T.getAsset('hurt.mp3').play();
					(new Audio('audio/hurt.mp3')).play();
				}
			}
		}
	});

	//红酒，加血
	var Wine = Prop.extend({
		asset: 'wine.png',
		action: function () {
			if (player.hp < 9)player.hp++;
			player.hpchange = 1;
			extime = 0;
			this.parent.add(new Text("+1", {x: player.x - 20, y: player.y - 60}));
			//T.getAsset('xueping.mp3').play();
			(new Audio('audio/xueping.mp3')).play();
		}
	});

	//(2)场景
	var finalstairnum = 0;
	//初始场景
	T.scene('ready', new T.Scene(function (stage) {
		stage.merge('interactive');
		status = 1;
		impacted = new Array;
		if (bgmusic)bgmusic.pause();
		//bgmusic = T.getAsset('bg0.mp3');
		bgmusic = new Audio('audio/bg0.mp3');
		bgmusic.loop = true;
		bgmusic.play();
		var bg0 = new T.Sprite({asset: "game_start.png", w: info_screen.w, h: info_screen.h});
		if (bro > 0)bg0.asset = 'game_start_m.png';
		stage.add(bg0);
		bg0.on("down", enterGame);
		stage.add(new Flicker({
			asset: "title.png", w: 650, h: 230,
			center: {x: 325, y: 115}, x: 0.5 * info_screen.w, y: 0.18 * info_screen.h
		}));
		var lihui = new T.Sprite({
			asset: "game_startlihui.png",
			w: bro > 0 ? 220 : 270,
			h: bro > 0 ? 240 : 300,
			center: {x: bro > 0 ? 110 : 135, y: bro > 0 ? 120 : 150},
			x: bro > 0 ? 360 : 965,
			y: bro > 0 ? 780 : 628,
			alpha: 0.7
		});
		stage.add(lihui);
		var fireball1 = new AnimPlayer({x: bro > 0 ? 10 : 20, y: bro > 0 ? 400 : 290, w: bro > 0 ? 75 : 200, h: 100});
		fireball1.setAnimSheet("sheet_fire", "fire");
		stage.add(fireball1);
		var fireball2 = new AnimPlayer({x: bro > 0 ? 630 : 1685, y: bro > 0 ? 400 : 290, w: bro > 0 ? 75 : 200, h: 100});
		fireball2.setAnimSheet("sheet_fire", "fire");
		stage.add(fireball2);
		stage.add(new T.Sprite({
			asset: "pillar.png",
			w: bro > 0 ? 95 : 254,
			h: bro > 0 ? 330 : 340,
			x: bro > 0 ? 0 : -4,
			y: bro > 0 ? 457 : 355
		}));
		stage.add(new T.Sprite({
			asset: "pillar1.png",
			w: bro > 0 ? 95 : 254,
			h: bro > 0 ? 330 : 365,
			x: bro > 0 ? 620 : 1660,
			y: bro > 0 ? 467 : 360
		}));
		T.input.on('left', enterGame);
		T.input.on('right', enterGame);
		T.input.on('enter', enterGame);
	}, {sort: true}));
	//进入游戏函数
	var enterGame = function () {
		if (status == 1) T.stageScene('game');
	};
	//游戏场景
	T.scene("game", new T.Scene(function (stage) {
		stage.merge('interactive');
		status = 2;
		if (bgmusic)bgmusic.pause();
		//bgmusic = T.getAsset('bgmusic.mp3');
		bgmusic = new Audio('audio/bgmusic.mp3');
		bgmusic.play();
		start_x = end_x = finalstairnum = 0;
		leftdown = rightdown = down_g = false;
		var bg = new T.Sprite({asset: "background.png", w: bro > 0 ? info_screen.w : 1216, h: 1880});
		bg.update = function () {
			this.y += gspeed / 3;
			if (this.y < -565) {
				this.y += 565;
			}
		};
		bg.on("down", function () {
			down_g = true;
		});
		bg.on("move", function (e) {
			if (!down_g)return;
			if (start_x != end_x) start_x = end_x;
			end_x = e.pos.x;
		});
		bg.on("up", function () {
			end_x = start_x;
			leftdown = rightdown = down_g = false;
		});
		stage.add(bg);
		if (bro > 0) {
			var leftkey = new T.Sprite({
				asset: "right.png", z: 1000, alpha: 0.3, scale: {x: -1, y: 1},
				w: 250, h: 200, center: {x: 125, y: 100}, x: 140, y: 1100
			});
			leftkey.on("down", function () {
				leftdown = true;
				this.alpha = 0.1;
			});
			leftkey.on("up", function () {
				leftdown = false;
				this.alpha = 0.3;
			});
			stage.add(leftkey);
			var rightkey = new T.Sprite({asset: "right.png", z: 1000, alpha: 0.3, w: 250, h: 200, x: 440, y: 1000});
			rightkey.on("down", function () {
				rightdown = true;
				this.alpha = 0.1;
			});
			rightkey.on("up", function () {
				rightdown = false;
				this.alpha = 0.3;
			});
			stage.add(rightkey);
		}
		stage.add(new T.Sprite({asset: "frame.png", w: bro > 0 ? info_screen.w : 1216, h: info_screen.h, z: 100}));
		stage.add(new StairCase({x: bro > 0 ? 0.02 * info_screen.w : 20}));
		stage.add(new StairCase({x: bro > 0 ? 0.96 * info_screen.w : 1156}));
		stage.add(new LoadStair());
		player = new Player();
		stage.add(player);
		var rotate = new AnimPlayer({
			w: bro > 0 ? 36 : 60,
			h: 0.0556 * info_screen.h,
			x: bro > 0 ? 0.488 * info_screen.w : 594,
			y: 0.0843 * info_screen.h,
			z: 200
		});
		rotate.setAnimSheet("sheet_rotate", "rotate");
		stage.add(rotate);
		var pw = bro > 0 ? info_screen.w : 1216;
		var bat = new Array();
		for (var i = 0; i < 3; i++) {
			bat[i] = new AnimPlayer({
				w: 40, h: 40, x: bro > 0 ? 100 + i * 200 : 300 + i * 200, y: 1100 + i * 300, z: 2,
				speed: Math.random() * 2 * Math.pow(-1, i + 2), scale: {x: Math.pow(-1, i + 1), y: 1}
			});
			bat[i].setAnimSheet("sheet_bat", "bat");
			bat[i].action = function () {
				this.x += this.speed;
				this.y += gspeed / 2;
				if (this.x > pw) {
					this.speed = Math.random() * -2;
					this.scale.x = 1;
					this.y = parseInt(Math.random() * 800) + 150;
				}
				if (this.x < 0) {
					this.speed = Math.random() * 2;
					this.scale.x = -1;
					this.y = parseInt(Math.random() * 800) + 150;
				}
				if (this.y < 100) {
					this.y = 1300;
					this.x = parseInt(Math.random() * 700);
					var i = parseInt(Math.random() * 2);
					this.speed = Math.random() * 2 * Math.pow(-1, i + 2);
					this.scale.x = Math.pow(-1, i + 1);
				}
			};
			stage.add(bat[i]);
		}
		var zhizhu = new Array();
		for (var i = 0; i < 2; i++) {
			zhizhu[i] = new AnimPlayer({
				w: 30,
				h: 25,
				x: bro > 0 ? 100 + 500 * i : 200 + i * 800,
				y: 150 + i * 565,
				z: 1,
				speed: 0.5,
				alpha: 0.9
			});
			zhizhu[i].setAnimSheet("sheet_zhizhu", "zhizhu");
			zhizhu[i].action = function () {
				this.x += this.speed;
				this.y += gspeed / 3;
				if (this.x > pw) {
					this.speed = -0.5;
					this.scale.x = -1;
				}
				if (this.x < 20) {
					this.speed = 0.5;
					this.scale.x = 1;
				}
				if (this.y < 100) {
					this.y += 1130;
					this.x = parseInt(Math.random() * 700);
					var random = parseInt(Math.random() * 2);
					if (random) {
						this.speed = 0.5;
						this.scale.x = 1;
					} else {
						this.speed = -0.5;
						this.scale.x = -1;
					}
				}
			};
			stage.add(zhizhu[i]);
		}
		var torch = new Array();
		var liew = bro > 0 ? 0.385 * info_screen.w : 468;
		var xq = bro > 0 ? 0.0518 * info_screen.w : 63;
		for (var i = 0; i < 18; i++) {
			var hang = Math.floor(i / 3);
			var lie = i % 3;
			torch[i] = new AnimPlayer({
				w: bro > 0 ? 12 : 20,
				h: bro > 0 ? 46 : 40,
				z: 1,
				x: xq + lie * liew + hang * 0.072 * info_screen.h,
				y: 260 + hang * 188,
				alpha: 0.8
			});
			torch[i].setAnimSheet("sheet_torch", "torch");
			torch[i].action = function () {
				this.y += gspeed / 3;
				if (this.y < 130)this.y += 1130;
			};
			stage.add(torch[i]);
		}
		var ghost = new Array();
		for (var i = 0; i < 2; i++) {
			ghost[i] = new AnimPlayer({
				x: 700 - i * 600, y: 500 + i * 565, z: 1, w: 36, h: 42, alpha: 0.6, speed: 2, scale: {x: -1, y: 1}
			});
			ghost[i].setAnimSheet("sheet_ghost", "ghost");
			ghost[i].action = function () {
				this.x += this.speed;
				this.y += gspeed / 3;
				if (this.x > pw) {
					this.speed = -2;
					this.scale.x = 1;
				}
				if (this.x < 0) {
					this.speed = 2;
					this.scale.x = -1;
				}
				if (this.y < 100) {
					this.y += 1130;
					this.x = parseInt(Math.random() * 700);
					var random = parseInt(Math.random() * 2);
					if (random) {
						this.speed = 2;
						this.scale.x = -1;
					} else {
						this.speed = -2;
						this.scale.x = 1;
					}
				}
			};
			stage.add(ghost[i]);
		}
		var kuijiabing = new Array();
		for (var i = 0; i < 2; i++) {
			kuijiabing[i] = new AnimPlayer({
				x: 500, y: 320 + i * 565, w: 45, h: 45, z: 1, speed: -1 + 2 * i, alpha: 0.7, scale: {x: -1 + i * 2, y: 1}
			});
			kuijiabing[i].setAnimSheet("sheet_kuijiabing", "kuijiabing");
			kuijiabing[i].action = function () {
				this.x += this.speed;
				this.y += gspeed / 3;
				if (this.x > pw) {
					this.speed = -1.5;
					this.scale.x = -1;
				}
				if (this.x < 0) {
					this.speed = 1.5;
					this.scale.x = 1;
				}
				if (this.y < 100) {
					this.y += 1130;
					this.x = parseInt(Math.random() * 700);
					var random = parseInt(Math.random() * 2);
					if (random) {
						this.speed = 1.5;
						this.scale.x = 1;
					} else {
						this.speed = -1.5;
						this.scale.x = -1;
					}
				}
			};
			stage.add(kuijiabing[i]);
		}
		if (bro > 0) {
			stage.add(new T.Sprite({
				w: 0.2 * info_screen.w,
				h: 0.07 * info_screen.h,
				x: 10,
				y: 30,
				asset: "floor.png",
				z: 101
			}));
			stage.add(new Score({x: 160, y: 30, w: 60, h: 76, spacing: 70}));
			stage.add(new T.Sprite({w: 0.09 * info_screen.w, h: 80, x: 400, y: 25, asset: "life.png", z: 101}));
			stage.add(new T.Sprite({w: 70, h: 70, x: 480, y: 30, asset: "hp.png", z: 101}));
			stage.add(new T.Sprite({w: 70, h: 70, x: 550, y: 30, asset: "x.png", z: 101}));
			var hp = new T.Sprite({w: 70, h: 70, x: 620, y: 30, asset: "9.png", z: 101});
			hp.update = function () {
				this.asset = player.hp + ".png";
			};
			stage.add(hp);
		} else {
			stage.add(new T.Sprite({w: 704, h: 1080, x: 1216, asset: "frame2.png", z: 8}));
			stage.add(new T.Sprite({w: 693, h: 1072, x: 1222, y: 5, asset: "frame2_beijing.png", z: 9}));
			stage.add(new T.Sprite({w: 220, h: 76, x: 1300, y: 30, asset: "floor.png", z: 11}));
			stage.add(new Score({x: 1550, y: 30, w: 66, h: 76, spacing: 100}));
			stage.add(new T.Sprite({w: 150, h: 76, x: 1300, y: 150, asset: "life.png", z: 10}));
			stage.add(new T.Sprite({w: 70, h: 70, x: 1500, y: 150, asset: "hp.png", z: 10}));
			stage.add(new T.Sprite({w: 70, h: 70, x: 1600, y: 150, asset: "x.png", z: 10}));
			var hp = new T.Sprite({w: 70, h: 70, x: 1700, y: 150, asset: "9.png", z: 10});
			hp.update = function () {
				this.asset = player.hp + ".png";
			};
			stage.add(hp);
			stage.add(new Expression());
		}
		T.input.on('enter', function () {
			if (!stage.paused) {
				stage.pause();
				bgmusic.pause();
			} else {
				stage.unpause();
				bgmusic.play();
			}
		});
	}, {sort: true}));


	////(3)加载资源
	T.load([
			"ordinarystair.png", "background.png", "bg_over.png", "conveyorstair.png", "trampolinestair.png", "fragilestair.png", "thornstair.png", "frame.png", "player.png", "staircase.png", "frame.png", "hp.png", "0.png", "1.png", "2.png", "3.png", "4.png", "5.png", "6.png", "7.png", "8.png", "9.png", "game_start.png", "game_start_m.png", "game_clear.png", "rotate.png", "torch.png", "bat.png", "zhizhu.png", "ghost.png", "kuijiabing.png", "fire.png", "pillar.png", "pillar1.png", "title.png", "floor.png", "life.png", "x.png", "game_startlihui.png", "addhpeffect.png", "diaoxue.png", "right.png", "frame2.png", "frame2_beijing.png", "player_lihui1.png", "player_lihui2.png", "player_lihui3.png", "coin.png", "wine.png", "cross.png", "skull.png"], function () {
			T.sheet("sheet_conveyorstair", "conveyorstair.png", {tw: 500, th: 56});
			T.sheet("sheet_trampolinestair", "trampolinestair.png", {tw: 400, th: 188});
			T.sheet("sheet_fragilestair", "fragilestair.png", {tw: 196, th: 120});
			T.sheet("sheet_staircase", "staircase.png", {tw: 79, th: 1920});
			T.sheet("sheet_player", "player.png", {tw: 296, th: 294});
			T.sheet("sheet_rotate", "rotate.png", {tw: 106, th: 106});
			T.sheet("sheet_torch", "torch.png", {tw: 102, th: 190});
			T.sheet("sheet_bat", "bat.png", {tw: 118, th: 118});
			T.sheet("sheet_zhizhu", "zhizhu.png", {tw: 196, th: 158});
			T.sheet("sheet_ghost", "ghost.png", {tw: 295, th: 354});
			T.sheet("sheet_kuijiabing", "kuijiabing.png", {tw: 47, th: 46});
			T.sheet("sheet_fire", "fire.png", {tw: 82, th: 152});
			T.sheet("sheet_addhp", "addhpeffect.png", {tw: 140, th: 200});
			T.sheet("sheet_diaoxue", "diaoxue.png", {tw: 140, th: 62});
			_.each([
				["conveyorstair", {move: {frames: _.range(0, 5), rate: 1 / 5}}],
				["trampolinestair", {
					bounce: {frames: _.range(0, 2), rate: 10},
					idle: {frames: [0], rate: 1}
				}],
				["fragilestair", {frag: {frames: _.range(0, 11), rate: 1 / 10}}],
				["player", {
					player_idle: {frames: [0], rate: 1},
					player_run: {frames: _.range(3, 9), rate: 1 / 5},
					player_down: {frames: [1], rate: 1}
				}],
				["staircase", {moveup: {frames: _.range(0, 7), rate: 1 / 3}}],
				["rotate", {anim: {frames: _.range(0, 6), rate: 1 / 3}}],
				["fire", {anim: {frames: _.range(0, 8), rate: 1 / 3}}],
				["torch", {anim: {frames: _.range(0, 6), rate: 1 / 3}}],
				["bat", {anim: {frames: _.range(0, 7), rate: 1 / 5}}],
				["zhizhu", {anim: {frames: _.range(0, 4), rate: 1 / 3}}],
				["ghost", {anim: {frames: _.range(0, 6), rate: 1 / 5}}],
				["kuijiabing", {anim: {frames: _.range(0, 13), rate: 1 / 4}}],
				["addhpeffect", {anim: {frames: _.range(0, 4), rate: 1 / 9}}],
				["diaoxue", {anim: {frames: _.range(0, 4), rate: 1 / 5}}]
			], function (anim) {
				T.fas(anim[0], anim[1]);
			});
			window.setTimeout(function () {
				T.stageScene('ready');
			}, 300);
			T.input.on('x', function () {
				T.stageScene('ready');
			});
		}
	);

	//碰撞函数,返回值意义：false；1,p从上方撞到f；2:下方；3：左方；4：右方
	var impact = function (p, f) {
		var p_x = p.x - (p.rw || p.w) / 2 + 1;
		var p_y = p.y - (p.rh || p.h) / 2 + 1;
		var p_xx = p.x + (p.rw || p.w) / 2 - 1;
		var p_yy = p.y + (p.rh || p.h) / 2 - 1;
		var p_x_speed = p.x_speed || 0;
		var p_y_speed = p.y_speed || 0;
		var f_x = f.x - (f.rw || f.w) / 2;
		var f_y = f.y - (f.rh || f.h) / 2;
		var f_xx = f.x + (f.rw || f.w) / 2;
		var f_yy = f.y + (f.rh || f.h) / 2;
		var f_x_speed = f.x_speed || 0;
		var f_y_speed = f.y_speed || 0;
		if (!((p_x > f_xx) || (p_y > f_yy) || (p_xx < f_x) || (p_yy < f_y))) {//碰撞了
			var r_x_speed = p_x_speed - f_x_speed;
			var r_y_speed = p_y_speed - f_y_speed;
			var x_cha = p.x - p.bx;
			if (r_y_speed) {//下落中
				if (impacted[f.id])return impacted[f.id];
				p_x = p.bx - (p.rw || p.w) / 2 + 1;
				p_xx = p.bx - (p.rw || p.w) / 2 + 1;
				p_yy = p.by + (p.rh || p.h) / 2 - 1;
				if (x_cha > 0 && p_xx < f_x && p_yy > f_y) return 3;
				if (x_cha < 0 && p_x > f_xx && p_yy > f_y) return 4;
				return 1;
			} else if (impacted[f.id])return impacted[f.id];//在楼梯上持续碰撞
		}
		return false;
	};

	//存档
	function setStorage(score, floor) {
		var data = JSON.parse(localStorage.getItem(Game_name));
		if (data == null)data = [];
		data.push({score: score, floor: floor, time: new Date().toLocaleString()});
		data.sort(function (a, b) {
			if (a.score > b.score)return -1;
			else if (a.score == b.score && a.floor > b.floor)   return -1;
			else return 1;
		});
		localStorage.setItem(Game_name, JSON.stringify(data));
	}

	//判断人物是否已经越过该楼梯所在水平线
	function sameHorizontal(p, f) {
		if (p.y + (p.rh || p.h) / 2 > f.y - (f.rh || f.h) / 2)return true;
		return false;
	}
};
