function circularMeanDegrees(left, right) {
    const leftRadians = left * Math.PI / 180;
    const rightRadians = right * Math.PI / 180;
    return (Math.atan2(
        Math.sin(leftRadians) + Math.sin(rightRadians),
        Math.cos(leftRadians) + Math.cos(rightRadians)
    ) * 180 / Math.PI + 360) % 360;
}

function destinationPoint(latitude, longitude, bearing, distanceKm) {
    const angularDistance = distanceKm / 6371;
    const bearingRadians = bearing * Math.PI / 180;
    const latitudeRadians = latitude * Math.PI / 180;
    const longitudeRadians = longitude * Math.PI / 180;
    const targetLatitude = Math.asin(
        Math.sin(latitudeRadians) * Math.cos(angularDistance)
        + Math.cos(latitudeRadians) * Math.sin(angularDistance) * Math.cos(bearingRadians)
    );
    const targetLongitude = longitudeRadians + Math.atan2(
        Math.sin(bearingRadians) * Math.sin(angularDistance) * Math.cos(latitudeRadians),
        Math.cos(angularDistance) - Math.sin(latitudeRadians) * Math.sin(targetLatitude)
    );
    return {
        latitude: targetLatitude * 180 / Math.PI,
        longitude: ((targetLongitude * 180 / Math.PI + 540) % 360) - 180
    };
}

function pointDistanceKm(left, right) {
    const latitudeDelta = (right.latitude - left.latitude) * Math.PI / 180;
    const longitudeDelta = (right.longitude - left.longitude) * Math.PI / 180;
    const leftLatitude = left.latitude * Math.PI / 180;
    const rightLatitude = right.latitude * Math.PI / 180;
    const haversine = Math.sin(latitudeDelta / 2) ** 2
        + Math.cos(leftLatitude) * Math.cos(rightLatitude) * Math.sin(longitudeDelta / 2) ** 2;
    return 6371 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function momentValueAtRange(moment, rangeKm) {
    if (!moment?.moment_data?.length) return null;
    const gate = Math.round((rangeKm - moment.first_gate) / moment.gate_size);
    const value = moment.moment_data[gate];
    return Number.isFinite(value) ? value : null;
}

export function detectVelocityCoupletsFromSweep(records) {
    if (!Array.isArray(records) || records.length < 2) return [];
    const sortedRecords = [...records].sort((left, right) => left.azimuth - right.azimuth);
    const volume = sortedRecords[0]?.volume;
    if (!Number.isFinite(volume?.latitude) || !Number.isFinite(volume?.longitude)) return [];
    const candidates = [];

    sortedRecords.forEach((record, index) => {
        const nextRecord = sortedRecords[(index + 1) % sortedRecords.length];
        const angularGap = (nextRecord.azimuth - record.azimuth + 360) % 360;
        if (angularGap <= 0 || angularGap > 1.5) return;
        const velocity = record.velocity;
        const nextVelocity = nextRecord.velocity;
        if (!velocity || !nextVelocity) return;
        const firstRange = Math.max(5, velocity.first_gate, nextVelocity.first_gate);
        const lastRange = Math.min(
            150,
            velocity.first_gate + velocity.gate_count * velocity.gate_size,
            nextVelocity.first_gate + nextVelocity.gate_count * nextVelocity.gate_size
        );
        for (let rangeKm = firstRange; rangeKm <= lastRange; rangeKm += velocity.gate_size) {
            const leftVelocity = momentValueAtRange(velocity, rangeKm);
            const rightVelocity = momentValueAtRange(nextVelocity, rangeKm);
            if (leftVelocity === null || rightVelocity === null
                || leftVelocity < -64 || leftVelocity > 64
                || rightVelocity < -64 || rightVelocity > 64
                || Math.sign(leftVelocity) === Math.sign(rightVelocity)
                || Math.min(Math.abs(leftVelocity), Math.abs(rightVelocity)) < 10) continue;
            const shear = Math.abs(leftVelocity - rightVelocity);
            if (shear < 35) continue;
            const reflectivity = Math.max(
                momentValueAtRange(record.reflect, rangeKm) ?? -Infinity,
                momentValueAtRange(nextRecord.reflect, rangeKm) ?? -Infinity
            );
            if (reflectivity < 20) continue;
            const hasAdjacentSupport = [-velocity.gate_size, velocity.gate_size].some(offset => {
                const adjacentRange = rangeKm + offset;
                const adjacentLeft = momentValueAtRange(velocity, adjacentRange);
                const adjacentRight = momentValueAtRange(nextVelocity, adjacentRange);
                if (adjacentLeft === null || adjacentRight === null
                    || adjacentLeft < -64 || adjacentLeft > 64
                    || adjacentRight < -64 || adjacentRight > 64
                    || Math.sign(adjacentLeft) === Math.sign(adjacentRight)
                    || Math.min(Math.abs(adjacentLeft), Math.abs(adjacentRight)) < 10
                    || Math.abs(adjacentLeft - adjacentRight) < 30) return false;
                return Math.max(
                    momentValueAtRange(record.reflect, adjacentRange) ?? -Infinity,
                    momentValueAtRange(nextRecord.reflect, adjacentRange) ?? -Infinity
                ) >= 20;
            });
            if (!hasAdjacentSupport) continue;
            const bearing = circularMeanDegrees(record.azimuth, nextRecord.azimuth);
            candidates.push({
                ...destinationPoint(volume.latitude, volume.longitude, bearing, rangeKm),
                shear,
                rangeKm,
                bearing,
                reflectivity
            });
        }
    });

    const clusters = [];
    candidates
        .sort((left, right) => right.shear - left.shear)
        .some(candidate => {
            if (clusters.every(cluster => pointDistanceKm(cluster, candidate) >= 8)) {
                clusters.push(candidate);
            }
            return clusters.length >= 20;
        });
    return clusters.map(candidate => ({
        latitude: candidate.latitude,
        longitude: candidate.longitude,
        shearMs: Math.round(candidate.shear * 10) / 10,
        rangeKm: Math.round(candidate.rangeKm * 10) / 10,
        reflectivityDbz: Math.round(candidate.reflectivity),
        bearing: Math.round(candidate.bearing)
    }));
}

// Sweep candidates arrive sorted by elevation angle. An elevation the volume
// does not carry falls back to the lowest cut rather than failing, because
// which cuts exist changes between volumes and between products.
export function chooseSweepIndex(candidates, requestedElevation) {
  if (!Array.isArray(candidates) || !candidates.length) return -1;
  // Number(null) is 0 and Number.isInteger(0) is true, so coercing first lets
  // "no request" match a real elevation 0 cut. Only an actual integer counts.
  if (typeof requestedElevation !== 'number' || !Number.isInteger(requestedElevation)) return 0;
  const index = candidates.findIndex(candidate => Number(candidate?.elevation) === requestedElevation);
  return index === -1 ? 0 : index;
}
