public record PointDto(int x, int y);
public record PathRequest(PointDto start, PointDto goal);
public record PathResponse(PointDto[] path);