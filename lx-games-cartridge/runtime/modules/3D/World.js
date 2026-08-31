// @lx:module lxGames.threed.World;

lx.import(
    lxGames.threed,
    lxGames.threed.Camera
);

// @lx:namespace lxGames.threed;
class World {
    /**
     * config = {
     *	canvas
     *	color
     *	lights : []
     *	cameraPosition : {x, y, z}
     *	camera : cameraConstructor | [cameraConstructor, cameraConfig]
     *	cameraConfig
     * )
     */
    constructor(config) {
        this.spotLights = [];
        // Массив объектов, за пересечением которых мир следит автоматически
        this.forIntersect = [];
        // Мир кэширует пересечения при смещении мыши
        this.intersectsCache = [];

        var canvas = config.canvas,
            position = config.cameraPosition || { x:0, y:0, z:10000 },
            color = config.color !== undefined ? config.color : 0xffffff,
            lights = config.lights || [ 0xffffff, 0xaaaaaa, 0x777777 ];

        this.canvas = canvas;
        this.width = canvas.width('px');
        this.height = canvas.height('px');
        this.mouse = { x:0, y:0 };

        // this.renderer = new THREE.WebGLRenderer({ /*preserveDrawingBuffer: true,*/ alpha: true });
        this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
        this.renderer.setSize( this.width, this.height );
        if (color !== undefined) this.renderer.setClearColor(color);
        this.renderer.domElement.width = this.width;
        this.renderer.domElement.height = this.height;
        this.renderer.autoClear = true;
        canvas.getDomElem().appendChild( this.renderer.domElement );
        canvas.on('mousemove', [this, lx.self(cacheIntersects)]);
        canvas.on('resize', ()=>{
            this.width = canvas.width('px');
            this.height = canvas.height('px');
            this.renderer.setSize( this.width, this.height );
            this.renderer.domElement.width = this.width;
            this.renderer.domElement.height = this.height;
            this.renderer.autoClear = true;
        });

        this.scene = new THREE.Scene();
        var cameraConstructor = config.camera
                ? (lx.isArray(config.camera) ? config.camera[0] : config.camera)
                : lxGames.threed.Camera,
            cameraConfig = config.cameraConfig || ((config.camera && lx.isArray(config.camera)) ? config.camera[1] : {});
        this.camera = new cameraConstructor(this, cameraConfig);
        this.camera.setPosition(position);
        this.camera.lookAt(this.scene.position);

        this.addSpotLight(lights[0], position);
        this.addSpotLight(lights[1], {
            x: position.z,
            y: position.y,
            z: position.x
        });
        this.addSpotLight(lights[2], {
            x: position.x,
            y: position.z,
            z: position.y
        });

        lx.app.animation.addAction(()=> this.renderer.render( this.scene, this.camera ));
    }

    domElement() {
        return this.renderer.domElement;
    }

    addSpotLight(light, position) {
        let spotLight = new THREE.SpotLight(light);
        spotLight.position.set(position.x, position.y, position.z);
        this.scene.add(spotLight);
        this.spotLights.push(spotLight);
    }

    getMeshBuilder() {
        return new MeshBuilder(this);
    }

    /**
     * config = {
     *     parent
     *     geometry : new lx3dGeometry.cutBox(1000, 1000, 1000)
     *     material : new THREE.MeshLambertMaterial({ color : 0xff0000, wireframe: false })
     *     position : {x, y, z} | [Float, Float, Float] | THREE.Vector3
     *     clickable : bool
     * }
     */
    newMesh(config) {
        config = config || {};
        var mesh = new THREE.Mesh(config.geometry, config.material);
        if (config.parent) config.parent.add(mesh);
        else if (config.parent === undefined) this.scene.add( mesh );
        if (config.clickable && mesh.parent) this.forIntersect.push(mesh);
        if (config.position) {
            var p = config.position;
            if (lx.isArray(p)) p = {
                x: p[0],
                y: p[1],
                z: p[2]
            };

            mesh.position.set(p.x, p.y, p.z);
        }

        return mesh;
    }

    removeMesh(mesh) {
        let rec=(mesh)=> {
            this.forIntersect.lxRemove(mesh);
            for (let i=0, l=mesh.children.len; i<l; i++)
                rec(mesh.children[i]);
        }
        rec(mesh);
        if (mesh.parent) mesh.parent.remove(mesh);
    }

    /**
     * Помещает меш в родителя, может сделать его кликабельным
     */
    putIn(parent, mesh, clickable) {
        if (parent === undefined) this.scene.add(mesh);
        else parent.add(mesh);
        if (clickable) this.forIntersect.push(mesh);
    }

    newPlane(config) {
        if (config.geometry === undefined) {
            config.geometry = new THREE.PlaneBufferGeometry( config.size[0], config.size[1], 2, 2 );
        }

        if (config.material === undefined) {
            var mc = {
                side: THREE.DoubleSide
            };
            if (config.color) mc.color = config.color;
            config.material = new THREE.MeshBasicMaterial(mc);
        }

        var plane = this.newMesh(config);

        if (config.axis == 'xz') plane.rotation.x = Math.PI * 0.5;
        else if (config.axis == 'yz') plane.rotation.y = Math.PI * 0.5;

        return plane;
    }

    /**
     * Для отслеживания пересечений
     */
    __checkMousePosition(x, y) {
        let rect = this.canvas.getGlobalRect();
        this.mouse.x = ((x - rect.left) / this.width) * 2 - 1;
        this.mouse.y = - ((y - rect.top) / this.height) * 2 + 1;
    }

    /**
     * Универсальный метод для отслеживания пересечений
     */
    __findIntersects(x, y, arr) {
        if (!arr.length) return [];

        this.__checkMousePosition(x, y);
        var vector = new THREE.Vector3( this.mouse.x, this.mouse.y, 1 );
        vector.unproject( this.camera );

        var position = this.camera.position;
        var raycaster = new THREE.Raycaster( position, vector.sub( position ).normalize() );
        return raycaster.intersectObjects(arr);
    }

    /**
     * Навешивается на смещение мыши над канвасом, для автоматического отслеживания пересечений объектов
     */
    static cacheIntersects(event) {
        this.intersectsCache = this.__findIntersects(
            event.clientX,
            event.clientY,
            this.forIntersect
        );
    }

    /**
     * Если аргументы не передавать, будут возвращены пересечения с автоматически отслеживаемыми объектами
     */
    intersects(x, y, arr) {
        if (arr === undefined) return this.intersectsCache;
        return this.__findIntersects(x, y, arr);
    }
}

class MeshBuilder {
    constructor(world) {
        this.world = world;
        this._useUniqueGeometry = false;
        this._useUniqueMaterial = false;

        this.parent = undefined;
        this.geom = null;
        this.material = null;
        this.position = [0, 0, 0];
        this.clickable = false;
    }

    /**
     * @param {Boolean} [val = true]
     * @return {MeshBuilder}
     */
    useUniqueGeometry(val = true) {
        this._useUniqueGeometry = val;
        return this;
    }

    /**
     * @param {Boolean} [val = true]
     * @return {MeshBuilder}
     */
    useUniqueMaterial(val = true) {
        this._useUniqueMaterial = val;
        return this;
    }

    /**
     * @param {THREE.Geometry} geom
     * @return {MeshBuilder}
     */
    setGeometry(geom) {
        this.geom = geom;
        return this;
    }

    /**
     * @param {THREE.Material} material
     * @return {MeshBuilder}
     */
    setMaterial(material) {
        this.material = material;
        return this;
    }

    /**
     * @param {THREE.Mesh|undefined} mesh
     * @return {MeshBuilder}
     */
    setParent(parent = undefined) {
        this.parent = parent;
        return this;
    }

    dropParent() {
        this.parent = null;
        return this;
    }

    /**
     * @param position {
     *     THREE.Vector3
     *     | Tuple: [{Float}, {Float}, {Float}]
     *     | Object: {
     *         x {Float},
     *         y {Float},
     *         z {Float}
     *     }
     * }
     * @return {MeshBuilder}
     */
    setPosition(position) {
        this.position = position;
        return this;
    }

    /**
     * @param {Boolean} [val = true]
     * @return {MeshBuilder}
     */
    setClickable(val = true) {
        this.clickable = val;
        return this;
    }

    /**
     * @return {THREE.Mesh}
     */
    buildMesh() {
        return this.world.newMesh({
            parent: this.parent,
            geometry: (this._useUniqueGeometry ? this.geom.clone() : this.geom),
            material: (this._useUniqueMaterial ? this.material.clone() : this.material),
            position: this.position,
            clickable: this.clickable
        });
    }
}
