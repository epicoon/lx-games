// @lx:module lxGames.threed.GeometryCutBox;

lx.import(lxGames.threed);

// @lx:namespace lxGames.threed;
class GeometryCutBox extends THREE.Geometry {
    constructor(w, h, d, r, sectors) {
        super();
        const geom = __calc(w, h, d, r, sectors);
        this.vertices = geom.vertices;
        this.faces = geom.faces;
        this.faceVertexUvs[0] = geom.uvs;
        this.mergeVertices();
        this.computeFaceNormals();
    }
}

function __calc(w, h, d, r, sectors) {
    sectors = sectors || lxGames.threed.SMOOTH;
    r = r || [0, 0, 0, 0];
    if (sectors % 2) sectors++;
    let vertices = [],
        faces = [],
        uvs = [];

    function newPlane(h) {
        let lastAmt = vertices.length,
            amount = 0;

        // Vertices
        for (let i = 0; i < 4; i++) if (r[i]) {
            if ( r[i].push !== undefined ) {
                // Straight cut
                if (i % 2) {
                    vertices.push( new THREE.Vector3( w/2*((i<2)?1:-1), h, (d/2-r[i][1])*((!i||i==3)?1:-1) ) );
                    vertices.push( new THREE.Vector3( (w/2-r[i][0])*((i<2)?1:-1), h, d/2*((!i||i==3)?1:-1) ) );
                } else {
                    vertices.push( new THREE.Vector3( (w/2-r[i][0])*((i<2)?1:-1), h, d/2*((!i||i==3)?1:-1) ) );
                    vertices.push( new THREE.Vector3( w/2*((i<2)?1:-1), h, (d/2-r[i][1])*((!i||i==3)?1:-1) ) );
                }
            } else if (r[i] > 0) {
                // Convex cut
                if (i % 2) {
                    vertices.push( new THREE.Vector3( w/2*((i<2)?1:-1), h, (d/2-r[i])*((!i||i==3)?1:-1) ) );
                    vertices.push( new THREE.Vector3( (w/2-r[i])*((i<2)?1:-1), h, d/2*((!i||i==3)?1:-1) ) );
                } else {
                    vertices.push( new THREE.Vector3( (w/2-r[i])*((i<2)?1:-1), h, d/2*((!i||i==3)?1:-1) ) );
                    vertices.push( new THREE.Vector3( w/2*((i<2)?1:-1), h, (d/2-r[i])*((!i||i==3)?1:-1) ) );
                }
            } else {
                // Concave cut
                let R = -1 * r[i] * Math.sqrt(2);
                if (i % 2) {
                    vertices.push( new THREE.Vector3( w/2*((i<2)?1:-1), h, (d/2-R)*((!i||i==3)?1:-1) ) );
                    vertices.push( new THREE.Vector3( (w/2-R)*((i<2)?1:-1), h, d/2*((!i||i==3)?1:-1) ) );
                } else {
                    vertices.push( new THREE.Vector3( (w/2-R)*((i<2)?1:-1), h, d/2*((!i||i==3)?1:-1) ) );
                    vertices.push( new THREE.Vector3( w/2*((i<2)?1:-1), h, (d/2-R)*((!i||i==3)?1:-1) ) );
                }
            }
            amount += 2;
        } else {
            // Without cut
            vertices.push( new THREE.Vector3(w/2*((i<2)?1:-1), h, d/2*((!i||i==3)?1:-1)) );
            amount++;
        }

        // Basic triangles
        for (var i=0; i<amount-2; i++) {
            if (h > 0) faces.push( new THREE.Face3(lastAmt, lastAmt+i+1, lastAmt+i+2) );
            else faces.push( new THREE.Face3(lastAmt, lastAmt+i+2, lastAmt+i+1) );
        }

        // Additional vertices and triangles
        let vert = lastAmt;
        for (let j = 0; j < 4; j++) if (r[j]) {
            if ( r[j].push !== undefined ) {
                // Straight cut - don't need
            } else if (r[j] > 0) {
                // Convex cut
                let step = Math.PI/2 / sectors;
                for (let i = 1; i < sectors; i++) {
                    vertices.push( new THREE.Vector3(
                        (w/2 - r[j] + r[j] * Math.cos(i * step))*((j<2)?1:-1),
                        h,
                        (d/2 - r[j] + r[j] * Math.sin(i * step))*((!j||j==3)?1:-1)
                    ) );
                }
                // First big triangles
                if (h > 0) faces.push( new THREE.Face3(vert, lastAmt+amount, vert+1) );
                else faces.push( new THREE.Face3(lastAmt+amount, vert, vert+1) );
                // Rest triangles
                for (let i = 0; i < sectors - 2; i++) {
                    if (h > 0)
                        if (j % 2) faces.push( new THREE.Face3(vert+1, i+lastAmt+amount, i+lastAmt+amount+1) );
                        else faces.push( new THREE.Face3(vert, i+lastAmt+amount+1, i+lastAmt+amount) );
                    else if (j % 2) faces.push( new THREE.Face3(vert+1, i+lastAmt+amount+1, i+lastAmt+amount) );
                    else faces.push( new THREE.Face3(vert, i+lastAmt+amount, i+lastAmt+amount+1) );
                }
                amount += (sectors - 1);
            } else {
                // Concave cut
                let step = (Math.PI/2) / sectors;
                for (let i = 0; i <= sectors; i++) {
                    vertices.push( new THREE.Vector3(
                        (w/2 + r[j] * Math.cos(i * step))*((j<2)?1:-1),
                        h,
                        (d/2 + r[j] * Math.sin(i * step))*((!j||j==3)?1:-1)
                    ) );
                }
                for (let i = 0; i < sectors / 2; i++) {
                    if (h > 0) {
                        if (j % 2) {
                            faces.push( new THREE.Face3(vert+1, lastAmt+amount+1+i, lastAmt+amount+i) );
                            faces.push( new THREE.Face3(vert, lastAmt+amount+(sectors-i), lastAmt+amount-1+(sectors-i)) );
                        } else {
                            faces.push( new THREE.Face3(vert, lastAmt+amount+i, lastAmt+amount+1+i) );
                            faces.push( new THREE.Face3(vert+1, lastAmt+amount-1+(sectors-i), lastAmt+amount+(sectors-i)) );
                        }
                    } else {
                        if (j % 2) {
                            faces.push( new THREE.Face3(vert+1, lastAmt+amount+i, lastAmt+amount+1+i) );
                            faces.push( new THREE.Face3(vert, lastAmt+amount-1+(sectors-i), lastAmt+amount+(sectors-i)) );
                        } else {
                            faces.push( new THREE.Face3(vert, lastAmt+amount+1+i, lastAmt+amount+i) );
                            faces.push( new THREE.Face3(vert+1, lastAmt+amount+(sectors-i), lastAmt+amount-1+(sectors-i)) );
                        }
                    }
                }
                amount += (sectors + 1);
            }
            vert += 2;
        } else vert++;

        // For textures
        let l = uvs.length,
            ver = ['a', 'b', 'c'],
            materialIndex = (l == 0) ? 0 : 1;
        for (let i = l; i < faces.length; i++) {
            faces[i].materialIndex = materialIndex;
            uvs.push([]);
            for (let j = 0; j < 3; j++) {
                let v = vertices[ faces[i][ver[j]] ],
                    x = (w/2 + v.x) / w,
                    z = (d/2 - v.z) / d;
                uvs[i].push( new THREE.Vector2(x, z) );
            }
        }
    }

    newPlane(h / 2);
    newPlane(-h / 2);

    // Sew planes together
    let shift = vertices.length / 2,
        amt = 0;
    for (let i = 0; i < 4; i++)
        if (r[i]) amt += 2;
        else amt++;
    let amtBoof = amt,
        vert = 0,
        sectorL = [0, 0, 0, 0],
        sideL = [0, 0, 0, 0],
        totalL = [0, 0, 0, 0];
    for (let i = 0; i < 4; i++) {
        let v1, v2;
        if (r[i]) {
            if ( r[i].push !== undefined ) {
                // Straight cut
                faces.push( new THREE.Face3(vert, vert+shift, vert+1) );
                faces.push( new THREE.Face3(vert+1, vert+shift, vert+shift+1) );
            } else if (r[i] > 0) {
                // Convex cut
                faces.push( new THREE.Face3(vert, vert+shift, amt+(sectors-2)*+!(i%2)) );
                faces.push( new THREE.Face3(amt+(sectors-2)*+!(i%2), vert+shift, amt+(sectors-2)*+!(i%2)+shift) );
                faces.push( new THREE.Face3(amt+(sectors-2)*(i%2), amt+(sectors-2)*(i%2)+shift, vert+1) );
                faces.push( new THREE.Face3(vert+1, amt+(sectors-2)*(i%2)+shift, vert+1+shift) );
                for (let j = 0; j < sectors - 2; j++) {
                    if (i % 2) {
                        // Bottom
                        faces.push( new THREE.Face3(amt+1+(sectors - 3 - j), amt+(sectors - 3 - j), amt+1+shift+(sectors - 3 - j)) );
                        // Top
                        faces.push( new THREE.Face3(amt+(sectors - 3 - j), amt+shift+(sectors - 3 - j), amt+1+shift+(sectors - 3 - j)) );
                    } else {
                        faces.push( new THREE.Face3(amt+j, amt+1+j, amt+shift+j) );
                        faces.push( new THREE.Face3(amt+1+j, amt+1+shift+j, amt+shift+j) );
                    }
                }
                amt += (sectors - 1);
            } else {
                // Concave cut
                faces.push( new THREE.Face3(vert, vert+shift, amt+(sectors)*+(i%2)) );
                faces.push( new THREE.Face3(amt+(sectors)*+(i%2), vert+shift, amt+(sectors)*+(i%2)+shift) );
                faces.push( new THREE.Face3(vert+1, amt+(sectors)*+!(i%2), vert+1+shift) );
                faces.push( new THREE.Face3(vert+1+shift, amt+(sectors)*+!(i%2), amt+(sectors)*+!(i%2)+shift) );
                for (let j = 0; j < sectors / 2; j++) {
                    if (i % 2) {
                        faces.push( new THREE.Face3(amt+(sectors-j), amt+shift+(sectors-j), amt-1+(sectors-j) ) );
                        faces.push( new THREE.Face3(amt-1+(sectors-j), amt+shift+(sectors-j), amt+shift-1+(sectors-j) ) );
                        faces.push( new THREE.Face3(amt+j, amt+1+j, amt+shift+j ) );
                        faces.push( new THREE.Face3(amt+1+j, amt+shift+1+j, amt+shift+j) );
                    } else {
                        faces.push( new THREE.Face3(amt+j, amt+shift+j, amt+1+j) );
                        faces.push( new THREE.Face3(amt+1+j, amt+shift+j, amt+shift+1+j) );
                        faces.push( new THREE.Face3( amt+(sectors-j), amt-1+(sectors-j), amt+shift+(sectors-j) ) );
                        faces.push( new THREE.Face3( amt-1+(sectors-j), amt+shift-1+(sectors-j), amt+shift+(sectors-j) ) );
                    }
                }
                amt += (sectors + 1);
            }
            v1 = vert + 1;
            v2 = (vert + 2 == amtBoof) ? 0 : vert + 2;
            vert += 2;
        } else {
            v1 = vert;
            v2 = (vert + 1 == amtBoof) ? 0 : (vert + 1);
            vert++;
        }
        faces.push( new THREE.Face3(v1, v1+shift, v2) );
        faces.push( new THREE.Face3(v1+shift, v2+shift, v2) );
        if (i % 2) sideL[i] = Math.max(vertices[v2].x, vertices[v1].x) - Math.min(vertices[v2].x, vertices[v1].x);
        else sideL[i] = Math.max(vertices[v2].z, vertices[v1].z) - Math.min(vertices[v2].z, vertices[v1].z);
        if (r[i]) {
            if ( r[i].push != undefined ) {
                sectorL[i] = Math.sqrt( r[i][0] * r[i][0] + r[i][1] * r[i][1] );
                totalL[i] = sideL[i] + sectorL[i];
            } else if (r[i] > 0) {
                sectorL[i] = 2 * r[i] * Math.sin( Math.PI / (4 * sectors) );
                totalL[i] = sideL[i] + sectors * sectorL[i];
            } else {
                sectorL[i] = -2 * r[i] * Math.sin( Math.PI / (4 * sectors) );
            }
        }
    }

    // Textures for the seam
    let len = uvs.length;
    for (let i = 0; i < 4; i++) if (r[i]) {
        if ( r[i].push != undefined ) {
            // Straight cut
            uvs.push([]);
            faces[len].materialIndex = 2 + i;
            uvs[len].push( new THREE.Vector2(0.0, 1.0) );
            uvs[len].push( new THREE.Vector2(0.0, 0.0) );
            uvs[len].push( new THREE.Vector2(sectorL[i]/totalL[i], 1.0) );
            len++;
            uvs.push([]);
            faces[len].materialIndex = 2 + i;
            uvs[len].push( new THREE.Vector2(sectorL[i]/totalL[i], 1.0) );
            uvs[len].push( new THREE.Vector2(0.0, 0.0) );
            uvs[len].push( new THREE.Vector2(sectorL[i]/totalL[i], 0.0) );
            len++;
            uvs.push([]);
            faces[len].materialIndex = 2 + i;
            uvs[len].push( new THREE.Vector2(sectorL[i]/totalL[i], 1.0) );
            uvs[len].push( new THREE.Vector2(sectorL[i]/totalL[i], 0.0) );
            uvs[len].push( new THREE.Vector2(1.0, 1.0) );
            len++;
            uvs.push([]);
            faces[len].materialIndex = 2 + i;
            uvs[len].push( new THREE.Vector2(sectorL[i]/totalL[i], 0.0) );
            uvs[len].push( new THREE.Vector2(1.0, 0.0) );
            uvs[len].push( new THREE.Vector2(1.0, 1.0) );
            len++;
        } else if (r[i] > 0) {
            // Convex cut
            uvs.push([]);
            faces[len].materialIndex = 2 + i;
            uvs[len].push( new THREE.Vector2(0.0, 1.0) );
            uvs[len].push( new THREE.Vector2(0.0, 0.0) );
            uvs[len].push( new THREE.Vector2(sectorL[i]/totalL[i], 1.0) );
            len++;
            uvs.push([]);
            faces[len].materialIndex = 2 + i;
            uvs[len].push( new THREE.Vector2(sectorL[i]/totalL[i], 1.0) );
            uvs[len].push( new THREE.Vector2(0.0, 0.0) );
            uvs[len].push( new THREE.Vector2(sectorL[i]/totalL[i], 0.0) );
            len++;
            uvs.push([]);
            faces[len].materialIndex = 2 + i;
            uvs[len].push( new THREE.Vector2((sectorL[i] * (sectors - 1))/totalL[i], 1.0) );
            uvs[len].push( new THREE.Vector2((sectorL[i] * (sectors - 1))/totalL[i], 0.0) );
            uvs[len].push( new THREE.Vector2((sectorL[i] * sectors)/totalL[i], 1.0) );
            len++;
            uvs.push([]);
            faces[len].materialIndex = 2 + i;
            uvs[len].push( new THREE.Vector2((sectorL[i] * sectors)/totalL[i], 1.0) );
            uvs[len].push( new THREE.Vector2((sectorL[i] * (sectors - 1))/totalL[i], 0.0) );
            uvs[len].push( new THREE.Vector2((sectorL[i] * sectors)/totalL[i], 0.0) );
            len++;
            for (let j = 0; j < sectors - 2; j++) {
                uvs.push([]);
                faces[len].materialIndex = 2 + i;
                uvs[len].push( new THREE.Vector2((sectorL[i] * (sectors - j - 1))/totalL[i], 1.0) );
                uvs[len].push( new THREE.Vector2((sectorL[i] * (sectors - j - 2))/totalL[i], 1.0) );
                uvs[len].push( new THREE.Vector2((sectorL[i] * (sectors - j - 1))/totalL[i], 0.0) );
                len++;
                uvs.push([]);
                faces[len].materialIndex = 2 + i;
                uvs[len].push( new THREE.Vector2((sectorL[i] * (sectors - j - 2))/totalL[i], 1.0) );
                uvs[len].push( new THREE.Vector2((sectorL[i] * (sectors - j - 2))/totalL[i], 0.0) );
                uvs[len].push( new THREE.Vector2((sectorL[i] * (sectors - j - 1))/totalL[i], 0.0) );
                len++;
            }
            uvs.push([]);
            faces[len].materialIndex = 2 + i;
            uvs[len].push( new THREE.Vector2((sectorL[i] * sectors)/totalL[i], 1.0) );
            uvs[len].push( new THREE.Vector2((sectorL[i] * sectors)/totalL[i], 0.0) );
            uvs[len].push( new THREE.Vector2(1.0, 1.0) );
            len++;
            uvs.push([]);
            faces[len].materialIndex = 2 + i;
            uvs[len].push( new THREE.Vector2((sectorL[i] * sectors)/totalL[i], 0.0) );
            uvs[len].push( new THREE.Vector2(1.0, 0.0) );
            uvs[len].push( new THREE.Vector2(1.0, 1.0) );
            len++;
        } else {
            // Concave cut
            let app = - 1 * (r[i] * Math.sqrt(2) - r[i]);
            totalL[i] = sideL[i] + sectorL[i] * sectors + 2 * app;
            uvs.push([]);
            faces[len].materialIndex = 2 + i;
            uvs[len].push( new THREE.Vector2(0.0, 1.0) );
            uvs[len].push( new THREE.Vector2(0.0, 0.0) );
            uvs[len].push( new THREE.Vector2(app/totalL[i], 1.0) );
            len++;
            uvs.push([]);
            faces[len].materialIndex = 2 + i;
            uvs[len].push( new THREE.Vector2(app/totalL[i], 1.0) );
            uvs[len].push( new THREE.Vector2(0.0, 0.0) );
            uvs[len].push( new THREE.Vector2(app/totalL[i], 0.0) );
            len++;
            uvs.push([]);
            faces[len].materialIndex = 2 + i;
            uvs[len].push( new THREE.Vector2((totalL[i] - sideL[i])/totalL[i], 1.0) );
            uvs[len].push( new THREE.Vector2((totalL[i] - sideL[i] - app)/totalL[i], 1.0) );
            uvs[len].push( new THREE.Vector2((totalL[i] - sideL[i])/totalL[i], 0.0) );
            len++;
            uvs.push([]);
            faces[len].materialIndex = 2 + i;
            uvs[len].push( new THREE.Vector2((totalL[i] - sideL[i])/totalL[i], 0.0) );
            uvs[len].push( new THREE.Vector2((totalL[i] - sideL[i] - app)/totalL[i], 1.0) );
            uvs[len].push( new THREE.Vector2((totalL[i] - sideL[i] - app)/totalL[i], 0.0) );
            len++;
            for (let j = 0; j < sectors / 2; j++) {
                uvs.push([]);
                faces[len].materialIndex = 2 + i;
                uvs[len].push( new THREE.Vector2((app + sectorL[i] * j)/totalL[i], 1.0) );
                uvs[len].push( new THREE.Vector2((app + sectorL[i] * j)/totalL[i], 0.0) );
                uvs[len].push( new THREE.Vector2((app + sectorL[i] * (j + 1))/totalL[i], 1.0) );
                len++;
                uvs.push([]);
                faces[len].materialIndex = 2 + i;
                uvs[len].push( new THREE.Vector2((app + sectorL[i] * (j + 1))/totalL[i], 1.0) );
                uvs[len].push( new THREE.Vector2((app + sectorL[i] * j)/totalL[i], 0.0) );
                uvs[len].push( new THREE.Vector2((app + sectorL[i] * (j + 1))/totalL[i], 0.0) );
                len++;
                uvs.push([]);
                faces[len].materialIndex = 2 + i;
                uvs[len].push( new THREE.Vector2((app + sectorL[i] * (sectors - j - 0))/totalL[i], 1.0) );
                uvs[len].push( new THREE.Vector2((app + sectorL[i] * (sectors - j - 1))/totalL[i], 1.0) );
                uvs[len].push( new THREE.Vector2((app + sectorL[i] * (sectors - j - 0))/totalL[i], 0.0) );
                len++;
                uvs.push([]);
                faces[len].materialIndex = 2 + i;
                uvs[len].push( new THREE.Vector2((app + sectorL[i] * (sectors - j - 1))/totalL[i], 1.0) );
                uvs[len].push( new THREE.Vector2((app + sectorL[i] * (sectors - j - 1))/totalL[i], 0.0) );
                uvs[len].push( new THREE.Vector2((app + sectorL[i] * (sectors - j - 0))/totalL[i], 0.0) );
                len++;
            }
            uvs.push([]);
            faces[len].materialIndex = 2 + i;
            uvs[len].push( new THREE.Vector2((totalL[i] - sideL[i])/totalL[i], 1.0) );
            uvs[len].push( new THREE.Vector2((totalL[i] - sideL[i])/totalL[i], 0.0) );
            uvs[len].push( new THREE.Vector2(1.0, 1.0) );
            len++;
            uvs.push([]);
            faces[len].materialIndex = 2 + i;
            uvs[len].push( new THREE.Vector2((totalL[i] - sideL[i])/totalL[i], 0.0) );
            uvs[len].push( new THREE.Vector2(1.0, 0.0) );
            uvs[len].push( new THREE.Vector2(1.0, 1.0) );
            len++;
        }
    } else {
        uvs.push([]);
        faces[len].materialIndex = 2 + i;
        uvs[len].push( new THREE.Vector2(0.0, 1.0) );
        uvs[len].push( new THREE.Vector2(0.0, 0.0) );
        uvs[len].push( new THREE.Vector2(1.0, 1.0) );
        len++;
        uvs.push([]);
        faces[len].materialIndex = 2 + i;
        uvs[len].push( new THREE.Vector2(0.0, 0.0) );
        uvs[len].push( new THREE.Vector2(1.0, 0.0) );
        uvs[len].push( new THREE.Vector2(1.0, 1.0) );
        len++;
    }

    return {vertices, faces, uvs};
}
