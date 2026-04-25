public record PointDto(int x, int y);
public record PathRequest(PointDto start, PointDto goal);
public record PathResponse(PointDto[] path);

public record GridPathRequest(
    int width,
    int height,
    int[] cells,
    PointDto start,
    PointDto goal
);

public record GridPathResponse(
    PointDto[] path,
    bool found
);

public record MultiGoalPathRequest(
    int width,
    int height,
    int[] cells,
    PointDto start,
    PointDto[] goals
);

public record MultiGoalPathResponse(
    PointDto[] path,
    bool found
);