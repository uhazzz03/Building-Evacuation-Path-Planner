using System.Runtime.InteropServices;
using System.Linq;

{/*API communication*/}
var builder = WebApplication.CreateBuilder(args);
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});
var app = builder.Build();

app.UseCors();

app.MapGet("/health", () => "ok");

app.MapPost("/api/path", (PathRequest req) =>
{
    const int Max = 8192;
    var buf = Marshal.AllocHGlobal(Marshal.SizeOf<Native.EXPoint>() * Max);
    try
    {
        var s = new Native.EXPoint { x = req.start.x, y = req.start.y };
        var g = new Native.EXPoint { x = req.goal.x, y = req.goal.y };

        int count = Native.ex_find_path_stub(s, g, buf, Max);
        if (count <= 0)
        {
            return Results.BadRequest(new { message = "No path or native error." });
        }

        var result = new PointDto[count];
        int stride = Marshal.SizeOf<Native.EXPoint>();
        var p = buf;
        for (int i = 0; i < count; i++)
        {
            var pp = Marshal.PtrToStructure<Native.EXPoint>(p);
            result[i] = new PointDto(pp.x, pp.y);
            p += stride;
        }

        return Results.Ok(new PathResponse(result));
    }
    finally { Marshal.FreeHGlobal(buf); }
});

app.MapPost("/api/path/grid", (GridPathRequest req) =>
{
    Console.WriteLine($"Grid request received: {req.width}x{req.height}");

    const int Max = 8192;
    var buf = Marshal.AllocHGlobal(Marshal.SizeOf<Native.EXPoint>() * Max);

    try
    {
        var s = new Native.EXPoint { x = req.start.x, y = req.start.y };
        var g = new Native.EXPoint { x = req.goal.x, y = req.goal.y };

        var gridBytes = req.cells.Select(x => (byte)x).ToArray();

        int count = Native.ex_find_path_grid(
            gridBytes,
            req.width,
            req.height,
            s,
            g,
            buf,
            Max
        );

        Console.WriteLine($"Native returned count = {count}");

        if (count <= 0)
        {
            return Results.Ok(new GridPathResponse(Array.Empty<PointDto>(), false));
        }

        var result = new PointDto[count];
        int stride = Marshal.SizeOf<Native.EXPoint>();
        var p = buf;

        for (int i = 0; i < count; i++)
        {
            var pp = Marshal.PtrToStructure<Native.EXPoint>(p);
            result[i] = new PointDto(pp.x, pp.y);
            p += stride;
        }

        return Results.Ok(new GridPathResponse(result, true));
    }
    finally
    {
        Marshal.FreeHGlobal(buf);
    }
});

app.Run();