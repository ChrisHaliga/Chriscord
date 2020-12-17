

function activate(x)
{
	$("#bottom, #bottom .container").toggleClass("hide");
	if( x == 1)
	{
		$("content").addClass("active");
		$("content").attr("onclick", null);
		setTimeout(
		  function() 
		  {
		    $("#back").attr("onclick", "activate(0)");
		  }, 1)
	}else if( x== 0 )
	{
		$("content").removeClass("active");
		$("back").attr("onclick", "activate(0)");
		setTimeout(
		  function() 
		  {
		    $("content").attr("onclick", "activate(1)");
		  }, 1)
	}
}

function setScroll(x)
{
	if(x == -1)
	{
		$("content").scrollTop($("content").height());
	}else
	{
		$("content").scrollTop(x);
	}
}