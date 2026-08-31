// @lx:module lxGames.threed.Pulsator;

//TODO набросок, как идея. Скопирован из Замков Бургундии.
// Чтобы цвета запоминал и восстанавливал
// Чтобы конфигурировался

// @lx:namespace lxGames.threed;
class Pulsator {
    constructor() {
        this.animator = new lx.Timer(500);
        this.animator.meshes = [];
        this.animator.baseVectors = [];
        this.animator.k = 0.2;
        this.animator.extand = true;

        this.animator.on = function( mode ) {
            this.extand = mode;
            this.start();
        };

        this.animator.whileCycle(function() {
            var shift = this.shift(),
                k, blue;
            if ( this.extand ) {
                k = 1 + this.k * shift;
                blue = 1 - shift;
            } else {
                k = 1 + this.k - this.k * shift;
                blue = shift;
            }

            for (let i in this.meshes) {
                let mesh = this.meshes[i];
                for (var j in mesh.geometry.vertices) {
                    mesh.geometry.vertices[j].copy( this.baseVectors[i][j] );
                    mesh.geometry.vertices[j].multiplyScalar(k);
                }
                mesh.geometry.verticesNeedUpdate = true;

                // __setMeshColor(this.meshes[i], [1, 1, blue]);
            }

            if ( this.isCycleEnd() ) {
                this.on( !this.extand );
            }
        });

        this.animator.off = function() {
            for (var i in this.baseVectors) {
                for (var j in this.baseVectors[i]) {
                    this.meshes[i].geometry.vertices[j].copy( this.baseVectors[i][j] );
                }
                this.meshes[i].geometry.verticesNeedUpdate = true;

                // __setMeshColor(this.meshes[i], [1, 1, 1]);
            }

            this.baseVectors = [];
            this.stop();
        };
    }

    start(meshes) {
        this.animator.off();

        for (let i in meshes) {
            let mesh = meshes[i];
            this.animator.baseVectors.push([]);
            for (let j in mesh.geometry.vertices) {
                let v = new THREE.Vector3();
                v.copy( mesh.geometry.vertices[j] );
                this.animator.baseVectors[i].push(v);
            }
        }

        this.animator.meshes = meshes;
        this.animator.on(true);
    }

    stop() {
        this.animator.off();
    }
}

function __setMeshColor(mesh, color) {
    let materials = lx.isArray(mesh.material) ? mesh.material : [mesh.material];

    //TODO нет поля color

    for (let  i = 0; i < materials.length; i++) {
        let mat = materials[i];
        mat.color.r = color[0];
        mat.color.g = color[1];
        mat.color.b = color[2];
    }
}
