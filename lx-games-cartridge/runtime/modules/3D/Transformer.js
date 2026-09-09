// @lx:module lxGames.threed.Transformer;

lx.import(lxGames.threed);

// @lx:namespace lxGames.threed;
class Transformer {
    /**
     * @param {THREE.Mesh} mesh
     * @param {Object} stretch {x, y, z}
     */
    static stretch(mesh, stretch) {
        if (stretch.x !== undefined) stretch = [stretch.x, stretch.y, stretch.z];

        let geom = mesh.geometry;

        // Determine the geometry bounds
        let min = new THREE.Vector3(),
            max = new THREE.Vector3();
        for (let i in geom.vertices) {
            let v = geom.vertices[i];
            if (v.x < min.x) min.x = v.x;
            if (v.y < min.y) min.y = v.y;
            if (v.z < min.z) min.z = v.z;
            if (v.x > max.x) max.x = v.x;
            if (v.y > max.y) max.y = v.y;
            if (v.z > max.z) max.z = v.z;
        }

        // Spread the vertices apart
        for (let i=0; i<3; i++) {
            if (!stretch[i]) continue;

            let axis = lxGames.threed.axisName[i],
                l0 = max[axis] - min[axis],
                l1 = l0 + stretch[i],
                k = l1 / l0;

            for (let i in geom.vertices) {
                geom.vertices[i][axis] *= k;
            }
        }

        mesh.geometry.verticesNeedUpdate = true;
    }
}
