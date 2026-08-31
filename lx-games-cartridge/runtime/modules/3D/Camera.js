// @lx:module lxGames.threed.Camera;

lx.import(
    lxGames.threed,
    lxGames.threed.Math
);

// @lx:namespace lxGames.threed;
class Camera extends THREE.PerspectiveCamera {
    static get hotkeys() {
        return {
            toForward:   87,  // camera movement forward
            toBack:      83,  // camera movement back
            toLeft:      65,  // camera movement to the left
            toRight:     68,  // camera movement to the right
            toUp:        69,  // camera movement up
            toDown:      67,  // camera movement down
            globalShift: 16,  // holding this key will move the camera in a global basis
            toDefault:   81   // point the camera to the default position for observation
        }
    }

    constructor(world, config={}) {
        let near = config.near || 1,
            far = config.far || 100000,
            keyboard = config.keyboard !== undefined ? config.keyboard : true,
            mouse = config.mouse || true,
            scene = world.scene;

        super(10, world.width / world.height, near, far);

        this.world = world;

        // Displacement speed
        this.speed = config.speed || 250;
        // Offset speed near tracked objects
        this.relativeSpeed = config.relativeSpeed || 0.03;
        // Mouse wheel zoom in/out speed
        this.scrollSpeed = config.scrollSpeed || 0.2;

        // How to interpret mouse panning - as moving the camera in the direction of the mouse, or in the opposite direction
        this.followMouse = lx.getFirstDefined(config.followMouse, false);
        // Space limit for camera position
        this.limits = config.limits || {};

        // Flag - whether to track objects
        this.watchForObjects = lx.getFirstDefined(config.watchForObjects, true);
        // Currently tracked object
        this.watchTarget = null;
        // A buffered object that you can return to tracking at any time
        this.defaultWatchTarget = null;

        this.locked = false;
        this.moving = false;

        let t = this;
        if (keyboard) lx.on('keydown', t.onkeydown.bind(t));
        if (mouse) {
            world.canvas.on('mousedown', t.onmousedown.bind(t));
            world.canvas.on('mousemove', t.onmousemove.bind(t));
            world.canvas.on('mouseup',   t.onmouseup.bind(t)  );
            world.canvas.on('mouseout',  t.onmouseup.bind(t)  );
            world.canvas.on('wheel',     t.onwheel.bind(t)    );
        }
        scene.add(this);
    }

    /**
     * @param config {Object: {
     *     [duration = 300] {Number},
     *     [onFinish] {Function}
     * }}
     */
    setTransposer(config) {
        __initTimer(this, config);
    }

    /**
     * Set the position of the camera in space
     */
    setPosition(pos) {
        this.position.x = pos.x;
        this.position.y = pos.y;
        this.position.z = pos.z;
    }

    /**
     * When moving, the camera will follow the target
     */
    watchFor(v) {
        if (v && v.position) {
            let obj = v;
            v = obj.getWorldPosition();
            this.targetObject = obj;
        }
        this.watchTarget = v ? new THREE.Vector3(v.x, v.y, v.z) : null;
        if (v) this.lookAt(this.watchTarget);
    }

    /**
     * Drop the current tracking on an object that has default tracking set
     */
    watchForDefault(v) {
        if (v !== undefined) this.defaultWatchTarget = v;
        this.watchFor(this.defaultWatchTarget);
    }

    /**
     * Rotate the passed vector according to the camera's tracking direction
     */
    applyLookDirection(vector) {
        let v = vector.clone(),
            rot = new THREE.Matrix4();
        rot.makeRotationFromQuaternion( this.quaternion );

        v.applyMatrix4(rot);
        return v;
    }

    /**
     * Distance to tracked object
     */
    distanceToTarget() {
        if (this.watchTarget === null) return false;
        return (new THREE.Vector3).subVectors(
            this.position,
            this.watchTarget
        ).length();
    }

    /**
     * Retrieve velocity for displacement - relative or absolute
     */
    getSpeed() {
        if (this.watchTarget === null) return this.speed;
        return this.distanceToTarget() * this.relativeSpeed;
    }

    /**
     * Moves the camera to the [[direction]] vector in the camera base or global - depending on the [[global]].
     * If there is an observed position in the case of the camera base, the camera will fly around
     * this position in the sphere according to the direction
     */
    shift(direction, global = false) {
        if (lx.isArray(direction)) direction = new THREE.Vector3(
            direction[0],
            direction[1],
            direction[2]
        );
        direction.multiplyScalar(this.getSpeed());

        let newPos = __calcNewPosition(this, direction, global);
        if (__newPositionIsInLimits(this, newPos))
            __applyNewPosition(this, newPos);
    }

    onkeydown() {
        if (this.locked) return;

        let keys = lxGames.threed.Camera.hotkeys,
            direction = [0, 0, 0];

        switch (true) {
            case lx.app.keyboard.keyPressed(keys.toForward): direction[2] = -1; break;
            case lx.app.keyboard.keyPressed(keys.toBack):    direction[2] =  1; break;
            case lx.app.keyboard.keyPressed(keys.toLeft):    direction[0] = -1; break;
            case lx.app.keyboard.keyPressed(keys.toRight):   direction[0] =  1; break;
            case lx.app.keyboard.keyPressed(keys.toUp):      direction[1] =  1; break;
            case lx.app.keyboard.keyPressed(keys.toDown):    direction[1] = -1; break;

            case lx.app.keyboard.keyPressed(keys.toDefault): this.watchForDefault();
        }

        if (!lxGames.threed.Math.zeroVector(direction))
            this.shift(direction, lx.app.keyboard.keyPressed(keys.globalShift));
    }

    onmousedown(e) {
        if (this.locked) { this.moving = false; return; }
        if (e.button == 0) {
            this.moving = true;
            this.lastMousePos = [e.clientX, e.clientY];
        }
    }

    onmousemove(e) {
        if (!this.moving || this.locked) { this.moving = false; return; }
        let delta = [
            e.clientX - this.lastMousePos[0],
            e.clientY - this.lastMousePos[1]
        ];
        this.lastMousePos = [e.clientX, e.clientY];
        this.shift([delta[0], -delta[1], 0]);
    }

    onmouseup(e) {
        if (this.locked) { this.moving = false; return; }
        if (e.button == 0) {
            this.moving = false;
        } else if (e.button == 1 && this.watchForObjects) {
            let arr = this.world.intersects();

            // If an empty space is clicked with the middle mouse, the tracking is reset
            this.watchFor(arr.lxEmpty() ? null : arr[0].object);
        }
    }

    onwheel(e) {
        if (this.locked) { this.moving = false; return; }
        let delta = (e.deltaY || e.detail || e.wheelDelta) * this.scrollSpeed;
        // Костыль - т.к. вектор смещения переворачивается в зависимости от следования за мышью
        if (!this.followMouse) delta = -delta;
        this.shift([0, 0, delta]);
    }
}


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * PRIVATE
 * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

/**
 * Calculate where you need to move the camera
 */
function __calcNewPosition(self, direction, global) {
    let newPos = new THREE.Vector3();
    if (global) newPos.addVectors(self.position, direction);
    else {
        let v = new THREE.Vector3(),
            constDist = (self.watchTarget && (direction.x || direction.y));
        direction = self.applyLookDirection(direction);
        if (constDist) {
            if (self.followMouse) v.addVectors(self.position, direction);
            else v.subVectors(self.position, direction);
            let dist = self.distanceToTarget();
            v.sub(self.watchTarget).normalize();
            v.multiplyScalar(dist);
            newPos.addVectors(self.watchTarget, v);
        } else {
            if (self.followMouse) newPos.addVectors(self.position, direction);
            else newPos.subVectors(self.position, direction);
        }
    }
    return newPos;
}

/**
 * Apply new position
 */
function __applyNewPosition(self, newPos) {
    self.position.copy(newPos);
    if (self.watchTarget) self.lookAt(self.watchTarget);
}

/**
 * Checking for going beyond the established limits
 */
function __newPositionIsInLimits(self, newPos) {
    if (self.limits.x) {
        if (newPos.x < self.limits.x[0]
            || newPos.x > self.limits.x[1]) return false;
    }
    if (self.limits.y) {
        if (newPos.y < self.limits.y[0]
            || newPos.y > self.limits.y[1]) return false;
    }
    if (self.limits.z) {
        if (newPos.z < self.limits.z[0]
            || newPos.z > self.limits.z[1]) return false;
    }
    return true;
}

function __initTimer(self, config) {
    self.transposer = new lx.Timer(config.duration);
    self.transposer._onFinish = config.onFinish || null;
    self.transposer.on = function( targetPosition, cameraToTargetVector = null ) {
        if (this.inAction) return;

        // Write down the initial positions and the quaternion
        this.pos0 = self.position.clone();
        this.q0 = self.quaternion.clone();

        // Calculate the position where we want to move the camera
        let pos1 = new THREE.Vector3(),
            vector = cameraToTargetVector
                ? cameraToTargetVector.clone()
                : new THREE.Vector3(0, self.position.y, self.position.z);
        pos1.addVectors( targetPosition, vector );

        // Calculate the final quaternion by placing the camera at the destination and rotating
        self.position.copy(pos1);
        self.lookAt(targetPosition);
        this.q1 = self.quaternion.clone();

        // Putting the camera back
        self.position.copy(this.pos0);
        self.quaternion.copy(this.q0);

        // Calculate the displacement vector
        this.shiftVector = new THREE.Vector3();
        this.shiftVector.subVectors( pos1, this.pos0 );
        this.shiftScalar = this.shiftVector.length();
        this.shiftVector.normalize();

        this.start();
    };

    self.transposer.whileCycle(function() {
        let k = this.shift(),
            q = new THREE.Quaternion();
        q.copy( this.q0 );
        q.slerp( this.q1, k );
        self.quaternion.copy( q );

        let shift = this.shiftVector.clone();
        shift.multiplyScalar( this.shiftScalar * k );
        let pos = this.pos0.clone();
        pos.add( shift );
        self.position.copy( pos );

        if (this.isCycleEnd()) {
            this.q0 = undefined;
            this.q1 = undefined;
            this.stop();
            if (this._onFinish) this._onFinish();
        }
    });
}
