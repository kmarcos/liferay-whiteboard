/**
 * Copyright (C) 2005-2014 Rivet Logic Corporation.
 * 
 * This program is free software; you can redistribute it and/or modify it under
 * the terms of the GNU General Public License as published by the Free Software
 * Foundation; version 3 of the License.
 * 
 * This program is distributed in the hope that it will be useful, but WITHOUT
 * ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
 * FOR A PARTICULAR PURPOSE. See the GNU General Public License for more
 * details.
 * 
 * You should have received a copy of the GNU General Public License along with
 * this program; if not, write to the Free Software Foundation, Inc., 51
 * Franklin Street, Fifth Floor, Boston, MA 02110-1301, USA.
 */

package com.rivetlogic.portlet.whiteboard.portlet;

import com.liferay.portal.kernel.cache.MultiVMPoolUtil;
import com.liferay.portal.kernel.cache.PortalCache;
import com.liferay.util.bridges.mvc.MVCPortlet;
import com.rivetlogic.portlet.whiteboard.atmosphere.WhiteboardHandler;

import javax.portlet.PortletException;

/***
 * 
 * MVC Portlet for whiteboard.
 * 
 * @author rivetlogic
 * 
 */

public class WhiteboardPortlet extends MVCPortlet {

    @Override
    public void init() throws PortletException {
        super.init();
        @SuppressWarnings("rawtypes")
        PortalCache portalCache = MultiVMPoolUtil.getCache(WhiteboardHandler.CACHE_NAME);
        portalCache.removeAll();
    }

}
