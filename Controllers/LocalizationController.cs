using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Localization;

namespace ChatApplication.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class LocalizationController : ControllerBase
    {
        private readonly IStringLocalizer<Labels> _localizer;

        public LocalizationController(IStringLocalizer<Labels> localizer)
        {
            _localizer = localizer;
        }

        [HttpGet("culture")]
        public IActionResult GetCulture()
        {
            return Ok(new
            {
                CurrentCulture = System.Globalization.CultureInfo.CurrentCulture.Name,
                CurrentUICulture = System.Globalization.CultureInfo.CurrentUICulture.Name
            });
        }

        [HttpGet("labels")]
        public IActionResult GetLabels()
        {
            var resourceSet = _localizer.GetAllStrings();
            var labels = new Dictionary<string, string>();
            foreach (var item in resourceSet)
            {
                labels.Add(item.Name, item.Value);
            }
            return Ok(labels);
        }
    }
}