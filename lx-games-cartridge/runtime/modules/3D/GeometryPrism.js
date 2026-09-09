// @lx:module lxGames.threed.GeometryPrism;

lx.import(lxGames.threed);

// @lx:namespace lxGames.threed;
class GeometryPrism extends THREE.Geometry {
    constructor(faces, vertices, height) {
        super();
        const geom = _calc(faces, vertices, height);
        this.vertices = geom.vertices;
        this.faces = geom.faces;
        this.faceVertexUvs[0] = geom.uvs;
        this.mergeVertices();
        this.computeFaceNormals();
    }
}

function _calc(argFaces, argVertices, argHeight) {
    let vertices = [],
        faces = [],
        uvs = [],
        h = argHeight * 0.5;

    argVertices.forEach(iV => {
        let v = iV.clone();
        v.y = h;
        vertices.push(v);
    });
    let vMidCount = vertices.length;
    argVertices.forEach(iV => {
        let v = iV.clone();
        v.y = -h;
        vertices.push(v);
    });

    argFaces.forEach(iF => {
        let f = iF.clone();
        // f.materialIndex = 0;
        faces.push(f);

        //TODO add texturing
        // For the top and bottom, find the X and Z extremes
        // The 2D minimum maps to the raster origin, the 2D maximum to the opposite corner
        // From these computed sizes, derive the texture offset for each vertex
        // let iUvs = [];
        // uvs.push(iUvs);
    });
    argFaces.forEach(iF => {
        let f = iF.clone();
        f.a += vMidCount;
        f.b += vMidCount;
        f.c += vMidCount;
        let temp = f.a;
        f.a = f.c;
        f.c = temp;
        // f.materialIndex = 1;
        faces.push(f);
    });

    // The seam
    //TODO add texturing
    // The seam could be textured by splitting it into 4 regions and computing each, i.e. applying the texture to the seam 4 times
    // Or add a constructor parameter setting the number of seam texturing regions
    for (let i = 0; i < vMidCount - 1; i++) {
        let f = new THREE.Face3(i + 1 + vMidCount, i + 1, i);
        // f.materialIndex = 3;
        faces.push(f);
        f = new THREE.Face3(i + 1 + vMidCount, i, i + vMidCount);
        // f.materialIndex = 3;
        faces.push(f);
    }
    let f = new THREE.Face3(vMidCount, 0, vMidCount - 1);
    // f.materialIndex = 3;
    faces.push(f);
    f = new THREE.Face3(vMidCount, vMidCount - 1, 2 * vMidCount - 1);
    // f.materialIndex = 3;
    faces.push(f);

    return {vertices, faces, uvs};
}
