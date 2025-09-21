record PointDto(int x, int y);
record PathRequest(PointDto start, PointDto goal);
record PathResponse(PointDto[] path);