// @lx:module lxGames.SaveMenu;
// @lx:module-data: i18n = i18n.yaml;

lx.import(
	lx.ActiveBox,
	lx.Image
);

// @lx:namespace lxGames;
class SaveMenu extends lx.Box {
    modifyConfigBeforeApply(config) {
		let parent = null;
		if (config.parent) {
			parent = config.parent;
			delete config.parent;
		}
		config.geom = config.geom || [10, 15, 80, 60];
		config.header = config.header || lx.i18n(saveMenu);
    	config.closeButton = config.closeButton || {
			click: function() {
				this.getActiveBox().parent.del();
			}
		};
		config = {
			geom: true,
			depthCluster: lx.DepthClusterMap.CLUSTER_FRONT,
			formConfig: config
		};
		if (parent) config.parent = parent;
        return config;
    }

	static initCss(css) {
		css.inheritClass('lg-SaveMenu-Box', 'AbstractBox');
		css.addClass('lg-SaveMenu-list', {
			backgroundColor: css.preset.bodyBackgroundColor,
		});
		css.addClass('lg-SaveMenu-checked', {
			backgroundColor: css.preset.checkedMainColor,
		});
	}

	getBasicCss() {
		return {
			box: 'lg-SaveMenu-Box',
			list: 'lg-SaveMenu-list',
			checked: 'lg-SaveMenu-checked'
		};
	}

	// @lx:<context CLIENT:
    clientRender(config) {
    	super.clientRender(config);

		this.add(lx.Box, {
			geom: true,
			opacity: 0.5,
			fill: 'black',
			click: ()=>this.del()
		});
		const form = this.add(lx.ActiveBox, config.formConfig);

		form.begin();
    	let content = this.renderContent();
		form.end();

		this._core = null;
		this._env = null;
    	this.nameInput = content.nameInput;

		this.gamesList = lx.ModelCollection.create({
			schema: {
				type: {},
				image: {},
				name: {},
				date: {},
				gamers: {},
				isActive: {default: false}
			}
		});
		this.activeSave = null;

    	content.filter.on('change', function(e) {

    		//TODO фильтровать список игр
    		console.log('Filter has changed', e.newValue);
    	});

		const self = this;
    	content.list.matrix({
    		items: this.gamesList,
    		itemBox: [lx.Box, {height:'60px', gridProportional: {indent:'10px'}}],
    		itemRender: (box, model)=>{
    			let imgWrapper = new lx.Box({css:this.basicCss.box});
    			let img = imgWrapper.add(lx.Image, {filename: model.image});
    			img.adapt();

    			new lx.Box({field:'name', width:3, css:this.basicCss.box});
    			new lx.Box({field:'date', width:3, css:this.basicCss.box});
    			new lx.Box({field:'gamers', width:5, css:this.basicCss.box});

    			box.getChildren().forEach(c=>c.align(lx.CENTER, lx.MIDDLE));
    			box.style('cursor', 'pointer');
    			box.click(()=>_setActiveSave(this, model));
    			box.setField('isActive', function(value) {
					this.toggleClassOnCondition(value, self.basicCss.checked);
    			});
    		}
    	});
    }

    setEnvironment(env) {
		this._env = env;
		this._env.commonSocketRequest('getSavedGames', {
			gameType: this._env.type
		}).then(result=>this.gamesList.reset(result));

    	const actionBut = lx(this)>>actionBut;
    	actionBut.text(lx.i18n(save));
    	actionBut.click(()=>{
    		let gameName = this.getGameName();
    		if (gameName == '') {
    			lx.tostWarning(lx.i18n(needGameName));
    			return;
    		}

	    	this._env.socketRequest('saveGame', {gameName}).then(res=>{
	    		lx.tostMessage(lx.i18n(gameSaved));
	    		_unsetActiveSave(this);
				this.del();
	    	});
    	});
    }

    setCore(core) {
		this._core = core;
		this._core.socket.request('getSavedGames').then(result=>this.gamesList.reset(result));

    	let actionBut = lx(this)>>actionBut;
    	actionBut.text(lx.i18n(load));
    	actionBut.click(()=>{
    		let gameName = this.getGameName();
    		if (gameName == '' || !this.activeSave) {
    			lx.tostWarning(lx.i18n(needGameName));
    			return;
    		}

			this._core.__inConnecting = {
				password: ''
			};
			this._core.socket.trigger('loadGame', {
				type: this.activeSave.type,
				name: this.activeSave.name
			});
			this.del();
    	});
    }
	// @lx:context>


    getGameName() {
    	return this.nameInput.value();
    }

	renderContent() {
		const view = lx.ml(`
		<lx.Box> [_]\
			#streamProportional(indent:'10px')
			<lx.Box>\
				#gridProportional(stepX:'10px')
				<lx.Box> (width:3, text:lx.i18n(gameName)) #align(lx.CENTER, lx.MIDDLE)
				<lx.Input> @nameInput (width:6)
				<lx.Button> @actionBut (width:3)
			<lx.RadioGroup> @filter (cols:3, height:'auto', labels:[
				lx.i18n(yourSaves),
				lx.i18n(savesWithYou),
				lx.i18n(allSaves)
			])
			<lx.Box> .lgames-saved-games-list (height:8)
				<lx.Box> @list\
					#stream(direction:lx.VERTICAL, indent:'10px')
		`);
		return view;
    }
}

function _setActiveSave(self, model) {
	if (self.activeSave) self.activeSave.isActive = false;
	self.activeSave = model;
    self.nameInput.value(model.name);
    model.isActive = true;
}

function _unsetActiveSave(self) {
	if (self.activeSave) self.activeSave.isActive = false;
	self.activeSave = null;
	self.nameInput.value('');
}
